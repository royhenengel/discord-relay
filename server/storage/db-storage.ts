import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// BOT CONFIG
export async function getBotConfig() {
  const result = await db.select().from(botConfig).limit(1);
  if (result.length > 0) return result[0];

  if (process.env.DISCORD_BOT_TOKEN) {
    const fallback: InsertBotConfig = {
      botToken: process.env.DISCORD_BOT_TOKEN,
      rateLimit: "moderate",
      logLevel: "info",
      autoReconnect: true,
    };
    await updateBotConfig(fallback);
    return fallback;
  }

  try {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return undefined;
  }
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