import { Client, GatewayIntentBits, TextChannel, Message } from "discord.js";
import axios from "axios";
import { storage } from "../storage";
import { InsertActivityLog } from "@shared/schema";

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

    this.client.on("disconnect", async () => {
      this.isConnected = false;
      await storage.updateBotStats({ status: "offline" });
      await this.logActivity("WARN", "Bot disconnected from Discord");
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

      if (shouldRelay) {
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
              name: message.author.displayName || message.author.username,
              iconURL: message.author.displayAvatarURL(),
            },
            description: message.content,
            color: 0x5865f2,
            footer: {
              text: `Relayed from #${(message.channel as TextChannel).name}`,
            },
            timestamp: message.createdAt.toISOString(),
          };

          await targetChannel.send({ embeds: [relayEmbed] });

          // Send to n8n webhook
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
          console.error(
            `Failed to relay message to ${targetChannelId}:`,
            error,
          );
          await this.logActivity(
            "ERROR",
            `Failed to relay message to channel ${targetChannelId}: ${error}`,
          );
        }
      }
    }
  }

  private async handleCommand(message: Message) {
    const args = message.content.split(" ").slice(1);
    const command = args[0];

    await storage.updateBotStats({
      apiCalls: (await storage.getBotStats())?.apiCalls || 0 + 1,
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
    };

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
        await message.reply(
          "One or both channels not found or not accessible.",
        );
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

      await message.reply(
        `✅ Relay created: ${relayConfig.name} (ID: ${relayConfig.id})`,
      );
      await this.logActivity("INFO", `New relay created: ${relayConfig.name}`);
    } catch (error) {
      await message.reply(
        "❌ Failed to create relay. Check channel IDs and permissions.",
      );
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
        console.error(
          `Failed to send test message to ${relay.targetChannelId}:`,
          error,
        );
      }
    }

    await message.reply(
      `✅ Test messages sent to ${activeRelays.length} relay(s).`,
    );
    await this.logActivity(
      "INFO",
      `Test messages sent to ${activeRelays.length} relays`,
    );
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
    const config = await storage.getBotConfig();

    if (!config?.botToken) {
      throw new Error("Bot token not configured");
    }

    console.log("Using bot token:", config.botToken);

    await storage.updateBotStats({ status: "connecting" });
    await this.client.login(config.botToken);
    console.log("DISCORD_BOT_TOKEN from env:", process.env.DISCORD_BOT_TOKEN);
    console.log("Bot token from config:", config.botToken);
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
