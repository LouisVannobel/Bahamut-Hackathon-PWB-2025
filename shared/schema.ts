import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  walletAddress: text("wallet_address"),
  password: text("password"),
  ftnBalance: integer("ftn_balance").notNull().default(100),
  lbrBalance: integer("lbr_balance").notNull().default(50),
  createdAt: text("created_at").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  betAmount: integer("bet_amount").notNull(),
  betToken: text("bet_token").notNull(),
  betColor: text("bet_color").notNull(),
  result: text("result").notNull(),
  timestamp: text("timestamp").notNull(),
});

// Mise à jour du schéma d'insertion pour inclure les nouveaux champs
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
}).extend({
  password: z.string().optional(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
