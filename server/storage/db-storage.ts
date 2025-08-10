import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import dns from "dns";
import {
  schema,
  botConfig,
  botStats,
  relayConfigs,
  activityLogs,
  type InsertBotConfig,
  type BotStats,
  type InsertBotStats,
  type InsertRelayConfig,
  type InsertActivityLog,
} from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import fs from "fs/promises";
import crypto from "crypto";

const CONFIG_PATH = "./data/bot-config.json";

// Force IPv4 resolution to avoid ENETUNREACH errors
dns.setDefaultResultOrder("ipv4first");

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

// BOT CONFIG
export async function getBotConfig() {
  // 1) Read from DB first
  const { rows } = await pool.query(
    `select id, bot_token, rate_limit, log_level, auto_reconnect, created_at, updated_at, last_connected_at
     from bot_config
     order by created_at asc
     limit 1`
  );
  const row = rows[0];

  // 2) If DB has a row (even if bot_token is NULL), return it
  if (row) return {
    id: row.id,
    botToken: row.bot_token ?? null,
    rateLimit: row.rate_limit ?? "moderate",
    logLevel: row.log_level ?? "info",
    autoReconnect: row.auto_reconnect ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastConnectedAt: row.last_connected_at ?? null,
  };

  // 3) No row in DB: seed from ENV if present, else create an empty config row
  const envToken = process.env.DISCORD_BOT_TOKEN?.trim() || null;
  const seeded = await pool.query(
    `insert into bot_config (bot_token, rate_limit, log_level, auto_reconnect)
     values ($1, 'moderate', 'info', true)
     returning id, bot_token, rate_limit, log_level, auto_reconnect, created_at, updated_at, last_connected_at`,
    [envToken]
  );
  
  const s = seeded.rows[0];
  return {
    id: s.id,
    botToken: s.bot_token ?? null,
    rateLimit: s.rate_limit ?? "moderate",
    logLevel: s.log_level ?? "info",
    autoReconnect: s.auto_reconnect ?? true,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    lastConnectedAt: s.last_connected_at ?? null,
  };
}

export async function updateBotConfig(data: Partial<InsertBotConfig>) {
  const existing = await getBotConfig();

  if (!existing) {
    const newConfig: InsertBotConfig = {
      botToken: data.botToken || "",
      rateLimit: data.rateLimit || "moderate",
      logLevel: data.logLevel || "info",
      autoReconnect: data.autoReconnect ?? true,
    };
    await db.insert(botConfig).values(newConfig);
    return newConfig;
  }

  const updated = { ...existing, ...data };
  await db.update(botConfig).set(updated).where(eq(botConfig.id, existing.id));
  return updated;
}

// BOT STATS
export async function getBotStats() {
  const result = await db.select().from(botStats).limit(1);
  return result[0];
}

export async function updateBotStats(data: Partial<InsertBotStats>) {
  const existing = await getBotStats();

  if (!existing) {
    const newStats: BotStats = {
      id: crypto.randomUUID(),
      messagesRelayed: data.messagesRelayed ?? 0,
      apiCalls: data.apiCalls ?? 0,
      uptime: data.uptime ?? "0m",
      status: data.status ?? "offline",
      lastUpdated: new Date(),
    };
    await db.insert(botStats).values(newStats);
    return newStats;
  }

  const updated = { ...existing, ...data, lastUpdated: new Date() };
  await db.update(botStats).set(updated).where(eq(botStats.id, existing.id));
  return updated;
}

// RELAY CONFIGS
export async function getRelayConfigs() {
  return await db
    .select()
    .from(relayConfigs)
    .orderBy(desc(relayConfigs.createdAt));
}

export async function getRelayConfig(id: string) {
  const result = await db
    .select()
    .from(relayConfigs)
    .where(eq(relayConfigs.id, id))
    .limit(1);
  return result[0];
}

export async function createRelayConfig(data: InsertRelayConfig) {
  const newConfig = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    bidirectional: data.bidirectional ?? false,
    active: data.active ?? true,
  };
  await db.insert(relayConfigs).values(newConfig);
  return newConfig;
}

export async function updateRelayConfig(
  id: string,
  data: Partial<InsertRelayConfig>,
) {
  const existing = await getRelayConfig(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...data };
  await db.update(relayConfigs).set(updated).where(eq(relayConfigs.id, id));
  return updated;
}

export async function deleteRelayConfig(id: string) {
  const result = await db.delete(relayConfigs).where(eq(relayConfigs.id, id));
  return (result?.rowCount ?? 0) > 0;
}

// ACTIVITY LOGS
export async function getActivityLogs(limit = 50) {
  return await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
}

export async function createActivityLog(data: InsertActivityLog) {
  const log = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    channelId: data.channelId ?? null,
    userId: data.userId ?? null,
    ...data,
  };
  await db.insert(activityLogs).values(log);
  return log;
}

export async function clearActivityLogs() {
  await db.delete(activityLogs);
}