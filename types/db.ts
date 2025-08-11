import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { bot_config, bot_stats, activity_log, relay_config, memory_index, tasks_queue } from "../db/schema";

export type BotConfig = InferSelectModel<typeof bot_config>;
export type NewBotConfig = InferInsertModel<typeof bot_config>;

export type BotStats = InferSelectModel<typeof bot_stats>;
export type NewBotStats = InferInsertModel<typeof bot_stats>;

export type ActivityLog = InferSelectModel<typeof activity_log>;
export type NewActivityLog = InferInsertModel<typeof activity_log>;

export type RelayConfig = InferSelectModel<typeof relay_config>;
export type NewRelayConfig = InferInsertModel<typeof relay_config>;

export type MemoryIndex = InferSelectModel<typeof memory_index>;
export type NewMemoryIndex = InferInsertModel<typeof memory_index>;

export type TasksQueue = InferSelectModel<typeof tasks_queue>;
export type NewTasksQueue = InferInsertModel<typeof tasks_queue>;