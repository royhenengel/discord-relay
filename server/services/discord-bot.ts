// server/services/discord-bot.ts

import { Client, GatewayIntentBits, TextChannel, Message } from "discord.js";
import axios from "axios";
import { storage } from "../storage";
import { InsertActivityLog } from "@shared/schema";

/** Prefer env over DB; trim to remove sneaky whitespace/newlines */
const ENV_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();

/** Mask a token for safe logs */
const maskToken = (t?: string) => (t ? `${t.slice(0, 5)}...${t.slice(-5)}` : "(none)");

/** Check Discord gateway session-start limit so we don't burn identifies */
async function ensureSessionAvailable(token: string) {
  const { data } = await axios.get("https://discord.com/api/v10/gateway/bot", {
    headers: { Authorization: `Bot ${token}` },
  });

  const ssl = data?.session_start_limit;
  if (!ssl) return;

  if (ssl.remaining <= 0) {
    const ms = Number(ssl.reset_after ?? 0);
    const seconds = Math.max(1, Math.ceil(ms / 1000));
    throw new Error(
      `No session starts remaining. Try again in ~${seconds}s (reset_after=${ms}ms).`
    );
  }
}

export class DiscordBotService {
  private client: Client;
  private isConnected = false;
  private startTime = Date.now();

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on("ready", async () => {
      this.isConnected = true;
      console.log(`Bot logged in as ${this.client.user?.tag}`);

      await storage.updateBotStats({ status: "online" });
      await this.logActivity("INFO", "Bot connected to Discord WebSocket");
    });

    // discord.js v14 doesn’t emit "disconnect" on the Client; keep for compatibility
    this.client.on("shardDisconnect", async () => {
      this.isConnected = false;
      await storage.updateBotStats({ status: "offline" });
      await this.logActivity("WARN", "Bot shard disconnected");
    });

    this.client.on("messageCreate", async (message) => {
      if (message.author.bot) return;

      if (message.content.startsWith("!relay")) {
        await this.handleCommand(message);
        return;
      }

      await this.handleMessageRelay(message);
    });

    this.client.on("error", async (error) => {
      console.error("Discord bot error:", error);
      await this.logActivity("ERROR", `Bot error: ${error.message}`);
    });
  }

  private async handleMessageRelay(message: Message) {
    const relayConfigs = await storage.getRelayConfigs();
    const activeRelays = relayConfigs.filter((config) => config.active);

    for (const relay of activeRelays) {
      const shouldRelay =
        message.channelId === relay.sourceChannelId ||
        (relay.bidirectional && message.channelId === relay.targetChannelId);

      if (!shouldRelay) continue;

      const targetChannelId =
        message.channelId === relay.sourceChannelId
          ? relay.targetChannelId
          : relay.sourceChannelId;

      try {
        const targetChannel = (await this.client.channels.fetch(
          targetChannelId,
        )) as TextChannel;

        const relayEmbed = {
          author: {
            name: (message.member?.displayName || message.author.username),
            iconURL: message.author.displayAvatarURL(),
          },
          description: message.content,
          color: 0x5865f2,
          footer: {
            text: `Relayed from #${(message.channel as TextChannel).name}`,
          },
          timestamp: message.createdAt.toISOString(),
        } as const;

        await targetChannel.send({ embeds: [relayEmbed] });

        // Send to n8n webhook (best-effort)
        try {
          await axios.post(
            "https://royhen.app.n8n.cloud/webhook-test/discord-relay",
            {
              author: message.author.username,
              content: message.content,
              sourceChannelId: message.channelId,
              targetChannelId,
              originalMessageId: message.id,
              timestamp: message.createdAt.toISOString(),
            },
          );
        } catch (err) {
          console.error("Webhook relay to n8n failed:", err);
        }

        const currentStats = await storage.getBotStats();
        await storage.updateBotStats({
          messagesRelayed: (currentStats?.messagesRelayed || 0) + 1,
          apiCalls: (currentStats?.apiCalls || 0) + 1,
        });

        await this.logActivity(
          "RELAY",
          `Message relayed from #${(message.channel as TextChannel).name} to #${targetChannel.name} (ID: ${message.id})`,
        );
      } catch (error) {
        console.error(`Failed to relay message to ${targetChannelId}:`, error);
        await this.logActivity(
          "ERROR",
          `Failed to relay message to channel ${targetChannelId}: ${error}`,
        );
      }
    }
  }

  private async handleCommand(message: Message) {
    const args = message.content.split(" ").slice(1);
    const command = args[0];

    const stats = await storage.getBotStats();
    await storage.updateBotStats({
      apiCalls: (stats?.apiCalls || 0) + 1, // fixed precedence bug
    });

    await this.logActivity(
      "CMD",
      `User @${message.author.username} executed command: !relay ${command}`,
    );

    switch (command) {
      case "status":
        await this.handleStatusCommand(message);
        break;
      case "add":
        await this.handleAddRelayCommand(message, args.slice(1));
        break;
      case "remove":
        await this.handleRemoveRelayCommand(message, args.slice(1));
        break;
      case "test":
        await this.handleTestCommand(message);
        break;
      default:
        await message.reply(
          "Unknown command. Available commands: status, add, remove, test",
        );
    }
  }

  private async handleStatusCommand(message: Message) {
    const stats = await storage.getBotStats();
    const relayConfigs = await storage.getRelayConfigs();
    const activeRelays = relayConfigs.filter((config) => config.active).length;
    const uptime = this.formatUptime(Date.now() - this.startTime);

    const embed = {
      title: "Bot Status",
      color: 0x5865f2,
      fields: [
        {
          name: "Status",
          value: this.isConnected ? "🟢 Online" : "🔴 Offline",
          inline: true,
        },
        { name: "Uptime", value: uptime, inline: true },
        { name: "Active Relays", value: activeRelays.toString(), inline: true },
        {
          name: "Messages Relayed",
          value: stats?.messagesRelayed?.toString() || "0",
          inline: true,
        },
        {
          name: "API Calls",
          value: stats?.apiCalls?.toString() || "0",
          inline: true,
        },
      ],
    } as const;

    await message.reply({ embeds: [embed] });
  }

  private async handleAddRelayCommand(message: Message, args: string[]) {
    if (args.length < 2) {
      await message.reply(
        "Usage: !relay add <source_channel_id> <target_channel_id> [bidirectional]",
      );
      return;
    }

    const [sourceId, targetId, bidirectional] = args;

    try {
      const sourceChannel = (await this.client.channels.fetch(
        sourceId,
      )) as TextChannel;
      const targetChannel = (await this.client.channels.fetch(
        targetId,
      )) as TextChannel;

      if (!sourceChannel || !targetChannel) {
        await message.reply("One or both channels not found or not accessible.");
        return;
      }

      const relayConfig = await storage.createRelayConfig({
        name: `${sourceChannel.name} → ${targetChannel.name}`,
        sourceChannelId: sourceId,
        targetChannelId: targetId,
        sourceChannelName: sourceChannel.name,
        targetChannelName: targetChannel.name,
        bidirectional: bidirectional === "true",
        active: true,
      });

      await message.reply(`✅ Relay created: ${relayConfig.name} (ID: ${relayConfig.id})`);
      await this.logActivity("INFO", `New relay created: ${relayConfig.name}`);
    } catch (error) {
      await message.reply("❌ Failed to create relay. Check channel IDs and permissions.");
      await this.logActivity("ERROR", `Failed to create relay: ${error}`);
    }
  }

  private async handleRemoveRelayCommand(message: Message, args: string[]) {
    if (args.length < 1) {
      await message.reply("Usage: !relay remove <relay_id>");
      return;
    }

    const relayId = args[0];
    const success = await storage.deleteRelayConfig(relayId);

    if (success) {
      await message.reply("✅ Relay removed successfully.");
      await this.logActivity("INFO", `Relay removed: ${relayId}`);
    } else {
      await message.reply("❌ Relay not found.");
    }
  }

  private async handleTestCommand(message: Message) {
    const relayConfigs = await storage.getRelayConfigs();
    const activeRelays = relayConfigs.filter((config) => config.active);

    if (activeRelays.length === 0) {
      await message.reply("No active relays to test.");
      return;
    }

    const testMessage = `🧪 Test message from relay bot - ${new Date().toLocaleString()}`;

    for (const relay of activeRelays) {
      try {
        const targetChannel = (await this.client.channels.fetch(
          relay.targetChannelId,
        )) as TextChannel;
        await targetChannel.send(testMessage);
      } catch (error) {
        console.error(`Failed to send test message to ${relay.targetChannelId}:`, error);
      }
    }

    await message.reply(`✅ Test messages sent to ${activeRelays.length} relay(s).`);
    await this.logActivity("INFO", `Test messages sent to ${activeRelays.length} relays`);
  }

  private async logActivity(
    type: string,
    message: string,
    channelId?: string,
    userId?: string,
  ) {
    const log: InsertActivityLog = {
      type,
      message,
      channelId,
      userId,
    };
    await storage.createActivityLog(log);
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  async connect() {
    // Pull current DB config
    const config = await storage.getBotConfig();

    const chosenToken = (config?.botToken?.trim?.() || "") || (ENV_BOT_TOKEN || "");

    // If we had to fall back to ENV and it differs from DB, persist it once:
    if (!config?.botToken && ENV_BOT_TOKEN) {
      await storage.updateBotConfig({ botToken: ENV_BOT_TOKEN });
    }

    if (!chosenToken) {
      throw new Error(
        "Bot token not configured. Set DISCORD_BOT_TOKEN or update bot_config.bot_token."
      );
    }

    // If ENV differs from DB, sync DB so UI/status match
    if (ENV_BOT_TOKEN && config?.botToken !== ENV_BOT_TOKEN) {
      await storage.updateBotConfig({ botToken: ENV_BOT_TOKEN });
    }

    // Safe logging: only masked token
    console.log("Discord bot using token:", maskToken(chosenToken));

    await storage.updateBotStats({ status: "connecting" });

    try {
      // PREVENT BUCKET BURNING: ensure we have session starts available
      await ensureSessionAvailable(chosenToken);

      const config = await storage.getBotConfig();
      const dbToken = (config?.botToken ?? "").trim();
      const envToken = (process.env.DISCORD_BOT_TOKEN ?? "").trim();

      console.log("[DBG] dbToken prefix:", dbToken.slice(0, 6), "len:", dbToken.length);
      console.log("[DBG] envToken present:", envToken ? "yes" : "no");

      // use DB as source of truth for token
      await this.client.login(chosenToken);
    } catch (err: any) {
      await storage.updateBotStats({ status: "offline" });

      const msg = String(err?.message || err);
      if (msg.startsWith("No session starts remaining")) {
        // Let the caller see the human-friendly message with reset_after
        throw err;
      }
      if (err?.code === "TokenInvalid") {
        throw new Error(
          "Discord login failed: TokenInvalid. Verify DISCORD_BOT_TOKEN is correct and not revoked."
        );
      }
      throw err;
    }
  }

  async disconnect() {
    this.client.destroy();
    this.isConnected = false;
    await storage.updateBotStats({ status: "offline" });
  }

  getStatus() {
    return {
      connected: this.isConnected,
      uptime: this.formatUptime(Date.now() - this.startTime),
    };
  }

  async updateUptime() {
    const uptime = this.formatUptime(Date.now() - this.startTime);
    await storage.updateBotStats({ uptime });
  }
}

export const discordBot = new DiscordBotService();