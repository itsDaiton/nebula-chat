import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('New conversation'),
    model: text('model').notNull().default('gpt-4o-mini'),
    systemPrompt: text('system_prompt'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('conv_user_idx').on(t.userId)],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    cached: boolean('cached').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('msg_conv_idx').on(t.conversationId)],
);
