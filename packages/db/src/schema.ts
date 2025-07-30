import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const stickers = pgTable("stickers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp().defaultNow().notNull(),
  creator: varchar({ length: 255 }).notNull(), // the Slack ID of the creator
  width: integer().notNull(),
  height: integer().notNull(),
  emojis: jsonb().$type<string[]>().notNull(),
  slackPermalink: text().notNull(),
  likes: jsonb().$type<string[]>().notNull().default([]), // array of Slack IDs of users who liked the sticker
});

export const authAttempt = pgTable("auth_attempt", {
  state: serial("id").primaryKey(),
  nonce: uuid("nonce").defaultRandom().notNull(),
  redirectUri: text("redirect_uri").notNull(),
});
