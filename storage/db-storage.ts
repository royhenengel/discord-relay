// server/storage/db-storage.ts
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
import crypto from "crypto";

dns.setDefaultResultOrder("ipv4first");

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

// ---------------- BOT CONFIG ----------------
export async function getBotConfig() {
  const { rows } = await pool.query(
    `select id,
            bot_token,
            rate_limit,
            log_level,
            auto_reconnect,
            n8n_webhook_url,
            created_at,
            updated_at,
            last_connected_at
       from bot_config
   order by created_at asc
      limit 1`
  );
  const row = rows[0];

  if (row) {
    // Return DB shape exactly (snake_case)
    return {
      id: row.id,
      bot_token: row.bot_token ?? null,
      rate_limit: row.rate_limit ?? "moderate",
      log_level: row.log_level ?? "info",
      auto_reconnect: row.auto_reconnect ?? true,
      n8n_webhook_url: row.n8n_webhook_url ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_connected_at: row.last_connected_at ?? null,
    };
  }

  // Seed a single row if none exists (token from ENV if present)
  const envToken = process.env.DISCORD_BOT_TOKEN?.trim() || null;
  const seeded = await pool.query(
    `insert into bot_config (bot_token, rate_limit, log_level, auto_reconnect, n8n_webhook_url)
     values ($1, 'moderate', 'info', true, null)
     returning id,
               bot_token,
               rate_limit,
               log_level,
               auto_reconnect,
               n8n_webhook_url,
               created_at,
               updated_at,
               last_connected_at`,
    [envToken]
  );

  const s = seeded.rows[0];
  return {
    id: s.id,
    bot_token: s.bot_token ?? null,
    rate_limit: s.rate_limit ?? "moderate",
    log_level: s.log_level ?? "info",
    auto_reconnect: s.auto_reconnect ?? true,
    n8n_webhook_url: s.n8n_webhook_url ?? null,
    created_at: s.created_at,
    updated_at: s.updated_at,
    last_connected_at: s.last_connected_at ?? null,
  };
}

export async function updateBotConfig(data: Partial<InsertBotConfig>) {
  const existing = await getBotConfig();

  if (!existing) {
    const toInsert: InsertBotConfig = {
      bot_token: data.bot_token ?? "",
      rate_limit: data.rate_limit ?? "moderate",
      log_level: data.log_level ?? "info",
      auto_reconnect: data.auto_reconnect ?? true,
      n8n_webhook_url: data.n8n_webhook_url ?? null,
    };
    await db.insert(botConfig).values(toInsert);
    // Return in snake_case
    return toInsert as any;
  }

  const updated = {
    ...existing,
    ...data,
  };

  await db
    .update(botConfig)
    .set({
      bot_token: updated.bot_token ?? null,
      rate_limit: updated.rate_limit ?? "moderate",
      log_level: updated.log_level ?? "info",
      auto_reconnect: updated.auto_reconnect ?? true,
      n8n_webhook_url: updated.n8n_webhook_url ?? null,
    } as any)
    .where(eq(botConfig.id, existing.id));

  return updated as any;
}

// ---------------- BOT STATS ----------------
export async function getBotStats() {
  const result = await db.select().from(botStats).limit(1);
  return result[0];
}

export async function updateBotStats(data: Partial<InsertBotStats>) {
  const existing = await getBotStats();

  if (!existing) {
    const newStats: BotStats = {
      id: crypto.randomUUID(),
      messages_relayed: (data as any).messages_relayed ?? 0,
      api_calls: (data as any).api_calls ?? 0,
      uptime: (data as any).uptime ?? "0m",
      status: (data as any).status ?? "offline",
      last_updated: new Date(),
    };
    await db.insert(botStats).values(newStats);
    return newStats;
  }

  const updated = { ...existing, ...data, last_updated: new Date() };
  await db.update(botStats).set(updated).where(eq(botStats.id, existing.id));
  return updated;
}

// --------------- RELAY CONFIGS ---------------
export async function getRelayConfigs() {
  return await db
    .select()
    .from(relayConfigs)
    .orderBy(desc(relayConfigs.created_at));
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
    created_at: new Date(),
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

// --------------- ACTIVITY LOGS ---------------
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
    channel_id: (data as any).channel_id ?? null,
    user_id: (data as any).user_id ?? null,
    ...data,
  };
  await db.insert(activityLogs).values(log);
  return log;
}

export async function clearActivityLogs() {
  await db.delete(activityLogs);
}