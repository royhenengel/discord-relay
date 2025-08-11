import { Client, GatewayIntentBits, Message } from "discord.js";
import { storage } from "../storage";
import { createActivityLog, updateBotStats } from "../storage/db-storage";

type SafeCfg = {
  botToken: string | null;
  n8nWebhookUrl: string | null;
};

export class DiscordBot {
  private client: Client;
  private startedAt: number | null = null;
  private connected = false;
  private n8nWebhookUrl: string | null = null;
  private currentToken: string | null = null;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on("ready", async () => {
      this.connected = true;
      if (!this.startedAt) this.startedAt = Date.now();
      await updateBotStats({ status: "online" });
      console.log("[bot] ready. n8n webhook:", this.n8nWebhookUrl ?? "(none)");
    });

    this.client.on("shardError", async (err) => {
      console.error("[bot] shard error:", err);
      this.connected = false;
      await updateBotStats({ status: "offline" });
    });

    this.client.on("messageCreate", (msg) => this.onMessage(msg));
  }

  getStatus() {
    const uptime =
      this.startedAt ? `${Math.max(0, Math.floor((Date.now() - this.startedAt) / 60000))}m` : "0m";
    return {
      connected: this.connected,
      status: this.connected ? "online" : "connecting",
      uptime,
      n8nWebhookUrl: this.n8nWebhookUrl,
    };
  }

  async updateUptime() {
    const uptime =
      this.startedAt ? `${Math.max(0, Math.floor((Date.now() - this.startedAt) / 60000))}m` : "0m";
    await updateBotStats({ uptime });
  }

  private async loadCfg(): Promise<SafeCfg> {
    const cfg = await storage.getBotConfig();
    return {
      botToken: cfg?.botToken?.trim() || null,
      n8nWebhookUrl: (cfg as any)?.n8nWebhookUrl?.trim?.() || null,
    };
  }

  async reloadConfig(): Promise<{ tokenChanged: boolean; urlChanged: boolean }> {
    const beforeToken = this.currentToken ?? null;
    const beforeUrl = this.n8nWebhookUrl ?? null;

    const { botToken, n8nWebhookUrl } = await this.loadCfg();

    this.n8nWebhookUrl = n8nWebhookUrl ?? null;
    this.currentToken = botToken ?? null;

    const tokenChanged = beforeToken !== this.currentToken;
    const urlChanged = beforeUrl !== this.n8nWebhookUrl;

    if (urlChanged) {
      console.log("[bot] n8n webhook URL updated:", this.n8nWebhookUrl ?? "(none)");
    }
    if (tokenChanged) {
      console.warn("[bot] Bot token changed in DB. A bot restart (disconnect/connect) is required.");
    }

    return { tokenChanged, urlChanged };
  }

  async connect() {
    const { botToken, n8nWebhookUrl } = await this.loadCfg();

    if (!botToken) {
      throw new Error("No Discord bot token found in DB (bot_config.bot_token).");
    }
    if (!n8nWebhookUrl) {
      console.warn("[bot] No n8n webhook URL set yet (bot_config.n8n_webhook_url).");
    }

    this.n8nWebhookUrl = n8nWebhookUrl;
    this.currentToken = botToken;

    console.log("[bot] logging in to Discord…");
    await this.client.login(botToken);
  }

  async disconnect() {
    try {
      await this.client.destroy();
    } finally {
      this.connected = false;
      await updateBotStats({ status: "offline" });
      console.log("[bot] disconnected.");
    }
  }

  private async onMessage(message: Message) {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      if (!this.n8nWebhookUrl) {
        await createActivityLog({
          type: "WARN",
          message: "Received message but n8nWebhookUrl is not configured",
          channelId: message.channel.id,
          userId: message.author.id,
        });
        return;
      }

      const payload = {
        platform: "discord",
        event: "messageCreate",
        messageId: message.id,
        timestamp: message.createdAt.toISOString(),
        guild: {
          id: message.guild.id,
          name: message.guild.name,
        },
        channel: {
          id: message.channel.id,
          name: (message.channel as any).name ?? null,
          type: message.channel.type,
        },
        author: {
          id: message.author.id,
          username: message.author.username,
          displayName:
            message.member?.displayName ??
            (message.author as any).displayName ??
            message.author.username,
        },
        content: message.content ?? "",
        attachments: Array.from(message.attachments.values()).map((a) => ({
          id: a.id,
          name: a.name,
          url: a.url,
          contentType: a.contentType,
          size: a.size,
        })),
      };

      const res = await fetch(this.n8nWebhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      await updateBotStats({ apiCalls: 1 });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`n8n webhook ${res.status} ${res.statusText} ${text}`);
      }

      await createActivityLog({
        type: "RELAY",
        message: "Relayed message to n8n",
        channelId: message.channel.id,
        userId: message.author.id,
      });
    } catch (err: any) {
      console.error("[bot] onMessage error:", err);
      await createActivityLog({
        type: "ERROR",
        message: `onMessage: ${err?.message ?? String(err)}`,
        channelId: message.channelId,
        userId: message.author?.id,
      });
    }
  }
}

export const discordBot = new DiscordBot();