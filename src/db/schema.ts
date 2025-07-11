import {
  timestamp,
  integer,
  jsonb,
  pgTable,
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
});
