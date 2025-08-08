import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Relay Config Table
export const relayConfigs = pgTable("relay_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sourceChannelId: text("source_channel_id").notNull(),
  targetChannelId: text("target_channel_id").notNull(),
  sourceChannelName: text("source_channel_name").notNull(),
  targetChannelName: text("target_channel_name").notNull(),
  bidirectional: boolean("bidirectional").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
});

// Activity Log Table
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp", { withTimezone: false }).defaultNow(),
  type: text("type").notNull(), // RELAY, CMD, INFO, WARN, ERROR
  message: text("message").notNull(),
  channelId: text("channel_id"),
  userId: text("user_id"),
});

// Bot Stats Table
export const botStats = pgTable("bot_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messagesRelayed: integer("messages_relayed").default(0),
  apiCalls: integer("api_calls").default(0),
  uptime: text("uptime"),
  status: text("status").default("offline"), // online, offline, connecting
  lastUpdated: timestamp("last_updated", { withTimezone: false }).defaultNow(),
});

// Bot Config Table
export const botConfig = pgTable("bot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  botToken: text("bot_token"),
  rateLimit: text("rate_limit").default("moderate"),
  logLevel: text("log_level").default("info"),
  autoReconnect: boolean("auto_reconnect").default(true),
});

// Insert Schemas (Zod)
export const insertRelayConfigSchema = createInsertSchema(relayConfigs).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertBotStatsSchema = createInsertSchema(botStats).omit({
  id: true,
  lastUpdated: true,
});

export const insertBotConfigSchema = createInsertSchema(botConfig).omit({
  id: true,
});

// Type Inference
export type InsertRelayConfig = z.infer<typeof insertRelayConfigSchema>;
export type RelayConfig = typeof relayConfigs.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertBotStats = z.infer<typeof insertBotStatsSchema>;
export type BotStats = typeof botStats.$inferSelect;

export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfig.$inferSelect;

const schema = {
  botConfig,
  botStats,
  relayConfigs,
  activityLogs,
};

export { schema };