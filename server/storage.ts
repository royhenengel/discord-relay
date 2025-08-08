import {
  type RelayConfig,
  type InsertRelayConfig,
  type ActivityLog,
  type InsertActivityLog,
  type BotStats,
  type InsertBotStats,
  type BotConfig,
  type InsertBotConfig,
} from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs/promises";
const CONFIG_PATH = "./data/bot-config.json";

export interface IStorage {
  getRelayConfigs(): Promise<RelayConfig[]>;
  getRelayConfig(id: string): Promise<RelayConfig | undefined>;
  createRelayConfig(config: InsertRelayConfig): Promise<RelayConfig>;
  updateRelayConfig(id: string, config: Partial<InsertRelayConfig>): Promise<RelayConfig | undefined>;
  deleteRelayConfig(id: string): Promise<boolean>;

  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  clearActivityLogs(): Promise<void>;

  getBotStats(): Promise<BotStats | undefined>;
  updateBotStats(stats: Partial<InsertBotStats>): Promise<BotStats>;

  getBotConfig(): Promise<BotConfig | undefined>;
  updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig>;
}

export class MemStorage implements IStorage {
  private relayConfigs = new Map<string, RelayConfig>();
  private activityLogs: ActivityLog[] = [];
  private botStats: BotStats | undefined = {
    id: randomUUID(),
    messagesRelayed: 0,
    apiCalls: 0,
    uptime: "0m",
    status: "offline",
    lastUpdated: new Date(),
  };

  async getRelayConfigs(): Promise<RelayConfig[]> {
    return Array.from(this.relayConfigs.values()).sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  }

  async getRelayConfig(id: string): Promise<RelayConfig | undefined> {
    return this.relayConfigs.get(id);
  }

  async createRelayConfig(config: InsertRelayConfig): Promise<RelayConfig> {
    const id = randomUUID();
    const relayConfig: RelayConfig = {
      ...config,
      id,
      createdAt: new Date(),
      bidirectional: config.bidirectional ?? false,
      active: config.active ?? true,
    };
    this.relayConfigs.set(id, relayConfig);
    return relayConfig;
  }

  async updateRelayConfig(id: string, config: Partial<InsertRelayConfig>): Promise<RelayConfig | undefined> {
    const existing = this.relayConfigs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...config };
    this.relayConfigs.set(id, updated);
    return updated;
  }

  async deleteRelayConfig(id: string): Promise<boolean> {
    return this.relayConfigs.delete(id);
  }

  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    return this.activityLogs
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const activityLog: ActivityLog = {
      ...log,
      id,
      timestamp: new Date(),
      channelId: log.channelId ?? null,
      userId: log.userId ?? null,
    };
    this.activityLogs.unshift(activityLog);
    if (this.activityLogs.length > 1000) {
      this.activityLogs = this.activityLogs.slice(0, 1000);
    }
    return activityLog;
  }

  async clearActivityLogs(): Promise<void> {
    this.activityLogs = [];
  }

  async getBotStats(): Promise<BotStats | undefined> {
    return this.botStats;
  }

  async updateBotStats(stats: Partial<InsertBotStats>): Promise<BotStats> {
    this.botStats = {
      ...this.botStats!,
      ...stats,
      lastUpdated: new Date(),
    };
    return this.botStats;
  }

  async getBotConfig(): Promise<BotConfig | undefined> {
    try {
      const data = await fs.readFile(CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    } catch {
      if (process.env.DISCORD_BOT_TOKEN) {
        const bootstrapped: BotConfig = {
          id: randomUUID(),
          botToken: process.env.DISCORD_BOT_TOKEN,
          rateLimit: "moderate",
          logLevel: "info",
          autoReconnect: true,
        };
        await this.updateBotConfig(bootstrapped);
        return bootstrapped;
      }
      return undefined;
    }
  }

  async updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig> {
    const existing = await this.getBotConfig();
    const updated: BotConfig = {
      id: existing?.id || randomUUID(),
      botToken: config.botToken ?? existing?.botToken ?? "",
      rateLimit: config.rateLimit ?? existing?.rateLimit ?? "moderate",
      logLevel: config.logLevel ?? existing?.logLevel ?? "info",
      autoReconnect: config.autoReconnect ?? existing?.autoReconnect ?? true,
    };
    await fs.mkdir("./data", { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(updated, null, 2));
    return updated;
  }
}

export const storage = new MemStorage();