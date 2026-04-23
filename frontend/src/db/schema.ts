import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  metaAppId: text("meta_app_id").default(""),
  metaAppSecret: text("meta_app_secret").default(""),
  webhookVerifyToken: text("webhook_verify_token").default(""),
  instagramRedirectUri: text("instagram_redirect_uri").default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const instagramAccounts = pgTable("instagram_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  igUserId: text("ig_user_id").notNull().unique(),
  username: text("username").notNull(),
  accessToken: text("access_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type MediaTarget = { id: string; caption?: string; media_type?: string };

export const autorespondRules = pgTable("autorespond_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  igAccountId: uuid("ig_account_id")
    .notNull()
    .references(() => instagramAccounts.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  mediaId: text("media_id"),
  mediaCaption: text("media_caption"),
  mediaType: text("media_type"),
  mediaTargets: jsonb("media_targets").$type<MediaTarget[]>(),
  triggerType: text("trigger_type").default("comment"),
  matchType: text("match_type").default("contains"),
  triggerKeyword: text("trigger_keyword").default(""),
  responseType: text("response_type").default("dm"),
  responseMessage: text("response_message").notNull(),
  responseImageUrl: text("response_image_url"),
  commentReplyMessage: text("comment_reply_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const broadcastJobs = pgTable("broadcast_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  igAccountId: uuid("ig_account_id")
    .notNull()
    .references(() => instagramAccounts.id),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  recipients: jsonb("recipients").notNull().$type<string[]>(),
  status: text("status").default("pending"), // pending | processing | completed
  sent: integer("sent").default(0),
  failed: integer("failed").default(0),
  total: integer("total").default(0),
  nextBatchIndex: integer("next_batch_index").default(0),
  nextBatchAt: timestamp("next_batch_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const imageStore = pgTable("image_store", {
  id: uuid("id").defaultRandom().primaryKey(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const messageLogs = pgTable("message_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  igAccountId: uuid("ig_account_id")
    .notNull()
    .references(() => instagramAccounts.id),
  ruleId: uuid("rule_id").references(() => autorespondRules.id),
  direction: text("direction").notNull(),
  messageType: text("message_type").notNull(),
  senderIgId: text("sender_ig_id").notNull(),
  content: text("content").notNull(),
  igMessageId: text("ig_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
