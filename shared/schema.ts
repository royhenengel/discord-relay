// shared/schema.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

// --- bot_config -------------------------------------------------------------
export const botConfig = pgTable("bot_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  bot_token: text("bot_token"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  rate_limit: text("rate_limit").notNull().default("moderate"),
  last_connected_at: timestamp("last_connected_at", { withTimezone: true }),
  log_level: text("log_level").notNull().default("info"),
  auto_reconnect: boolean("auto_reconnect").notNull().default(true),
  n8n_webhook_url: text("n8n_webhook_url"),
});

export type BotConfig = InferSelectModel<typeof botConfig>;
export type InsertBotConfig = InferInsertModel<typeof botConfig>;

// --- bot_stats --------------------------------------------------------------
export const botStats = pgTable("bot_stats", {
  id: uuid("id").primaryKey(),
  messages_relayed: text("messages_relayed"), // keeping as text if you already used text
  api_calls: text("api_calls"),
  uptime: text("uptime"),
  status: text("status"),
  last_updated: timestamp("last_updated", { withTimezone: true }),
});

export type BotStats = InferSelectModel<typeof botStats>;
export type InsertBotStats = InferInsertModel<typeof botStats>;

// --- relay_configs ----------------------------------------------------------
export const relayConfigs = pgTable("relay_configs", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  source_channel_id: text("source_channel_id").notNull(),
  target_channel_id: text("target_channel_id").notNull(),
  bidirectional: boolean("bidirectional").notNull().default(false),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RelayConfig = InferSelectModel<typeof relayConfigs>;
export type InsertRelayConfig = InferInsertModel<typeof relayConfigs>;

// --- activity_logs ----------------------------------------------------------
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  event: text("event").notNull(),
  details: text("details"),
  channel_id: text("channel_id"),
  user_id: text("user_id"),
});

export type ActivityLog = InferSelectModel<typeof activityLogs>;
export type InsertActivityLog = InferInsertModel<typeof activityLogs>;

// Export schema bundle (optional convenience)
export const schema = {
  botConfig,
  botStats,
  relayConfigs,
  activityLogs,
};