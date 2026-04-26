var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  conversations: () => conversations,
  messages: () => messages,
  users: () => users
});
import { pgTable, uuid, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New conversation"),
    model: text("model").notNull().default("gpt-4o-mini"),
    systemPrompt: text("system_prompt"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (t) => [index("conv_user_idx").on(t.userId)]
);
var messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    cached: boolean("cached").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (t) => [index("msg_conv_idx").on(t.conversationId)]
);

// src/client.ts
function createDbClient(config) {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10
  });
  const db = drizzle(pool, { schema: schema_exports });
  return { db, pool };
}
export {
  conversations,
  createDbClient,
  messages,
  users
};
//# sourceMappingURL=index.mjs.map