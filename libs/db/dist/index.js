"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  conversations: () => conversations,
  createDbClient: () => createDbClient,
  messages: () => messages,
  users: () => users
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = require("pg");

// src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  conversations: () => conversations,
  messages: () => messages,
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
  email: (0, import_pg_core.text)("email").notNull().unique(),
  passwordHash: (0, import_pg_core.text)("password_hash"),
  displayName: (0, import_pg_core.text)("display_name"),
  avatarUrl: (0, import_pg_core.text)("avatar_url"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
});
var conversations = (0, import_pg_core.pgTable)(
  "conversations",
  {
    id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, import_pg_core.uuid)("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: (0, import_pg_core.text)("title").notNull().default("New conversation"),
    model: (0, import_pg_core.text)("model").notNull().default("gpt-4o-mini"),
    systemPrompt: (0, import_pg_core.text)("system_prompt"),
    createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow().notNull()
  },
  (t) => [(0, import_pg_core.index)("conv_user_idx").on(t.userId)]
);
var messages = (0, import_pg_core.pgTable)(
  "messages",
  {
    id: (0, import_pg_core.uuid)("id").primaryKey().defaultRandom(),
    conversationId: (0, import_pg_core.uuid)("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
    role: (0, import_pg_core.text)("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: (0, import_pg_core.text)("content").notNull(),
    tokenCount: (0, import_pg_core.integer)("token_count"),
    cached: (0, import_pg_core.boolean)("cached").default(false),
    createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
  },
  (t) => [(0, import_pg_core.index)("msg_conv_idx").on(t.conversationId)]
);

// src/client.ts
function createDbClient(config) {
  const pool = new import_pg.Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10
  });
  const db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });
  return { db, pool };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  conversations,
  createDbClient,
  messages,
  users
});
//# sourceMappingURL=index.js.map