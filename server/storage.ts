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

import {
  getRelayConfigs,
  getRelayConfig,
  createRelayConfig,
  updateRelayConfig,
  deleteRelayConfig,
  getActivityLogs,
  createActivityLog,
  clearActivityLogs,
  getBotStats,
  updateBotStats,
  getBotConfig,
  updateBotConfig,
} from "./storage/db-storage";

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

export const storage: IStorage = {
  getRelayConfigs,
  getRelayConfig,
  createRelayConfig,
  updateRelayConfig,
  deleteRelayConfig,

  getActivityLogs,
  createActivityLog,
  clearActivityLogs,

  getBotStats,
  updateBotStats,

  getBotConfig,
  updateBotConfig,
};