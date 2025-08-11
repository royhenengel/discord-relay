import { pgTable, text, uuid, jsonb, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const bot_config = pgTable("bot_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value_json: jsonb("value_json").notNull().default({}),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bot_stats = pgTable("bot_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  metric: text("metric").notNull(),
  value_num: doublePrecision("value_num"),
  value_json: jsonb("value_json").default({}),
  period_start: timestamp("period_start", { withTimezone: true }).notNull(),
  period_end: timestamp("period_end", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activity_log = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  action: text("action").notNull(),
  detail_json: jsonb("detail_json").notNull().default({}),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const relay_config = pgTable("relay_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  guild_id: text("guild_id").notNull(),
  channel_id: text("channel_id").notNull(),
  feature: text("feature").notNull(),
  config_json: jsonb("config_json").notNull().default({}),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memory_index = pgTable("memory_index", {
  id: uuid("id").defaultRandom().primaryKey(),
  scope: text("scope").notNull(),
  entity_id: text("entity_id"),
  kind: text("kind").notNull(),
  key: text("key").notNull(),
  value_text: text("value_text"),
  value_json: jsonb("value_json"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks_queue = pgTable("tasks_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: text("status").notNull(),
  job_type: text("job_type").notNull(),
  payload_json: jsonb("payload_json").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  started_at: timestamp("started_at", { withTimezone: true }),
  finished_at: timestamp("finished_at", { withTimezone: true }),
  error_text: text("error_text"),
});