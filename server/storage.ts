import { type User, type InsertUser, type RelayConfig, type InsertRelayConfig, type ActivityLog, type InsertActivityLog, type BotStats, type InsertBotStats, type BotConfig, type InsertBotConfig } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Relay Config methods
  getRelayConfigs(): Promise<RelayConfig[]>;
  getRelayConfig(id: string): Promise<RelayConfig | undefined>;
  createRelayConfig(config: InsertRelayConfig): Promise<RelayConfig>;
  updateRelayConfig(id: string, config: Partial<InsertRelayConfig>): Promise<RelayConfig | undefined>;
  deleteRelayConfig(id: string): Promise<boolean>;
  
  // Activity Log methods
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  clearActivityLogs(): Promise<void>;
  
  // Bot Stats methods
  getBotStats(): Promise<BotStats | undefined>;
  updateBotStats(stats: Partial<InsertBotStats>): Promise<BotStats>;
  
  // Bot Config methods
  getBotConfig(): Promise<BotConfig | undefined>;
  updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private relayConfigs: Map<string, RelayConfig>;
  private activityLogs: ActivityLog[];
  private botStats: BotStats | undefined;
  private botConfig: BotConfig | undefined;

  constructor() {
    this.users = new Map();
    this.relayConfigs = new Map();
    this.activityLogs = [];
    
    // Initialize default bot stats
    this.botStats = {
      id: randomUUID(),
      messagesRelayed: 0,
      apiCalls: 0,
      uptime: "0m",
      status: "offline",
      lastUpdated: new Date(),
    };
    
    // Initialize default bot config
    this.botConfig = {
      id: randomUUID(),
      botToken: process.env.DISCORD_BOT_TOKEN || "",
      rateLimit: "moderate",
      logLevel: "info",
      autoReconnect: true,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getRelayConfigs(): Promise<RelayConfig[]> {
    return Array.from(this.relayConfigs.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
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
    };
    this.activityLogs.unshift(activityLog);
    
    // Keep only last 1000 logs
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
    return this.botConfig;
  }

  async updateBotConfig(config: Partial<InsertBotConfig>): Promise<BotConfig> {
    this.botConfig = {
      ...this.botConfig!,
      ...config,
    };
    return this.botConfig;
  }
}

export const storage = new MemStorage();
