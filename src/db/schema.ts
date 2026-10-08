import { bigint, boolean, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";

export interface BridgeStoredEvent {
  id: number;
  event: string;
  data: unknown;
}

/**
 * Ephemeral pairing sessions. Rows live only in server memory TTL terms
 * (pairing: 4 min, active: 2 h) and are swept on expiry — nothing personal
 * is persisted long-term. The per-role event queues carry WebRTC signaling.
 */
export const bridgeSessions = pgTable("bridge_sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  pcName: text("pc_name").notNull(),
  phoneName: text("phone_name"),
  joined: boolean("joined").notNull().default(false),
  pcOnline: boolean("pc_online").notNull().default(false),
  phoneOnline: boolean("phone_online").notNull().default(false),
  pcPresence: bigint("pc_presence", { mode: "number" }).notNull().default(0),
  phonePresence: bigint("phone_presence", { mode: "number" }).notNull().default(0),
  pcSeq: integer("pc_seq").notNull().default(0),
  phoneSeq: integer("phone_seq").notNull().default(0),
  pcEvents: jsonb("pc_events").$type<BridgeStoredEvent[]>().notNull().default([]),
  phoneEvents: jsonb("phone_events").$type<BridgeStoredEvent[]>().notNull().default([]),
});

export type BridgeSessionRow = typeof bridgeSessions.$inferSelect;
