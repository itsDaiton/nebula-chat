import { GENERIC_ERROR_MESSAGE } from '@nebula-chat/errors';
import type * as LangChainLib from '@nebula-chat/langchain';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';

const fakeTx = { __tx: true };

vi.mock('@backend/db', () => ({
  db: { transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(fakeTx)) },
  closeDb: vi.fn(async () => undefined),
}));

vi.mock('@backend/modules/conversation/conversation.repository', () => ({
  conversationRepository: {
    findByIdTx: vi.fn(),
    createTx: vi.fn(),
    findByIdSimple: vi.fn(),
  },
}));

vi.mock('@backend/modules/message/message.repository', () => ({
  messageRepository: { createTx: vi.fn(), findByConversationId: vi.fn() },
}));

vi.mock('@backend/modules/message/message.service', () => ({
  messageService: { createMessage: vi.fn() },
}));

// Only the LLM call is faked; the SSE formatters, token counter and model
// registry stay real so the emitted frames are the genuine article.
vi.mock('@nebula-chat/langchain', async (importOriginal) => ({
  ...(await importOriginal<typeof LangChainLib>()),
  streamChat: vi.fn(),
}));

import { streamChat } from '@nebula-chat/langchain';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import { messageRepository } from '@backend/modules/message/message.repository';
import { messageService } from '@backend/modules/message/message.service';
import {
  chatService,
  createUserMessage,
  validateChatRequest,
} from '@backend/modules/chat/chat.service';

const conversationRepo = vi.mocked(conversationRepository);
const messageRepo = vi.mocked(messageRepository);
const mockedStreamChat = vi.mocked(streamChat);
const mockedMessageService = vi.mocked(messageService);

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';
const USER_MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const ASSISTANT_MESSAGE_ID = '33333333-3333-4333-8333-333333333333';
// The session owner threaded into conversation creation (conversations.userId is
// NOT NULL, ADR-0010 §2).
const OWNER_ID = '44444444-4444-4444-8444-444444444444';

const request = (overrides: Partial<CreateChatStreamDTO> = {}): CreateChatStreamDTO =>
  ({
    model: 'gpt-4o-mini',
    conversationId: CONVERSATION_ID,
    messages: [{ role: 'user', content: 'what is 2+2?' }],
    ...overrides,
  }) as CreateChatStreamDTO;

/** Collects everything the service writes to the SSE stream. */
const collectStream = async (data: CreateChatStreamDTO, userId = 'anonymous') => {
  const frames: string[] = [];
  const result = await chatService.streamResponse(data, (chunk) => frames.push(chunk), userId);
  return { frames, joined: frames.join(''), result };
};

/** The payload of the stream's `error` frame — the shared error envelope. */
const errorFrame = (frames: string[]): unknown => {
  const frame = frames.find((f) => f.startsWith('event: error\n'));
  const data = frame && /^data: (.+)$/m.exec(frame)?.[1];
  return data ? JSON.parse(data) : undefined;
};

const eventNames = (frames: string[]) =>
  frames.map((f) => /^event: (.+)$/m.exec(f)?.[1]).filter(Boolean);

/** Drives the faked LLM to emit `tokens` and then report usage. */
const respondWith = (
  tokens: string[],
  usage = { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
) => {
  mockedStreamChat.mockImplementation(async (_config, callbacks) => {
    for (const token of tokens) callbacks.onToken(token);
    callbacks.onUsage(usage);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  conversationRepo.findByIdTx.mockResolvedValue(fromPartial({ id: CONVERSATION_ID }));
  conversationRepo.findByIdSimple.mockResolvedValue(fromPartial({ id: CONVERSATION_ID }));
  conversationRepo.createTx.mockResolvedValue(fromPartial({ id: CONVERSATION_ID }));
  messageRepo.createTx.mockResolvedValue(fromPartial({ id: USER_MESSAGE_ID }));
  messageRepo.findByConversationId.mockResolvedValue(fromPartial([]));
  mockedMessageService.createMessage.mockResolvedValue(fromPartial({ id: ASSISTANT_MESSAGE_ID }));
  respondWith(['4']);
});

describe('validateChatRequest', () => {
  it('accepts a user message within the token budget', async () => {
    await expect(
      validateChatRequest(
        CONVERSATION_ID,
        { role: 'user', content: 'hi' },
        OWNER_ID,
        'gpt-4o-mini',
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a non-user role', async () => {
    await expect(
      validateChatRequest(undefined, { role: 'assistant', content: 'hi' }, OWNER_ID),
    ).rejects.toThrow("Expected message with role 'user', received 'assistant'");
  });

  it('rejects a prompt over the token limit with a 413-mapped error', async () => {
    await expect(
      validateChatRequest(undefined, { role: 'user', content: 'word '.repeat(3000) }, OWNER_ID),
    ).rejects.toThrow(/exceeds token limit/);
  });

  it('names both the actual and the maximum token count in the error', async () => {
    await expect(
      validateChatRequest(undefined, { role: 'user', content: 'word '.repeat(3000) }, OWNER_ID),
    ).rejects.toThrow(/maximum allowed is 2000 tokens/);
  });

  it('rejects an unknown or unowned conversation', async () => {
    conversationRepo.findByIdSimple.mockResolvedValue(fromPartial(null));

    await expect(
      validateChatRequest(CONVERSATION_ID, { role: 'user', content: 'hi' }, OWNER_ID),
    ).rejects.toThrow(`Conversation with id "${CONVERSATION_ID}" not found`);
  });

  it('skips the conversation lookup when starting a new conversation', async () => {
    await validateChatRequest(undefined, { role: 'user', content: 'hi' }, OWNER_ID);

    expect(conversationRepo.findByIdSimple).not.toHaveBeenCalled();
  });
});

describe('createUserMessage', () => {
  it('reuses an existing conversation', async () => {
    const result = await createUserMessage(CONVERSATION_ID, 'hello', 'user', OWNER_ID);

    expect(result).toEqual({
      conversationId: CONVERSATION_ID,
      userMessageId: USER_MESSAGE_ID,
      isNewConversation: false,
    });
  });

  it('creates a conversation when none is supplied, owned by the session user', async () => {
    const result = await createUserMessage(undefined, 'hello there', 'user', OWNER_ID);

    expect(result.isNewConversation).toBe(true);
    expect(conversationRepo.createTx).toHaveBeenCalledWith(fakeTx, 'hello there', OWNER_ID);
  });

  it('titles a new conversation from the first 50 characters of the message', async () => {
    await createUserMessage(undefined, 'x'.repeat(80), 'user', OWNER_ID);

    expect(conversationRepo.createTx).toHaveBeenCalledWith(fakeTx, 'x'.repeat(50), OWNER_ID);
  });

  it("falls back to 'New Chat' for an empty first message", async () => {
    await createUserMessage(undefined, '', 'user', OWNER_ID);

    expect(conversationRepo.createTx).toHaveBeenCalledWith(fakeTx, 'New Chat', OWNER_ID);
  });

  it('throws when the supplied conversation does not exist', async () => {
    conversationRepo.findByIdTx.mockResolvedValue(fromPartial(null));

    await expect(createUserMessage(CONVERSATION_ID, 'hello', 'user', OWNER_ID)).rejects.toThrow(
      'not found',
    );
  });

  it('writes the user message inside the same transaction', async () => {
    await createUserMessage(CONVERSATION_ID, 'hello', 'user', OWNER_ID);

    expect(messageRepo.createTx).toHaveBeenCalledWith(fakeTx, {
      conversationId: CONVERSATION_ID,
      role: 'user',
      content: 'hello',
    });
  });
});

describe('chatService.streamResponse', () => {
  it('streams tokens, usage and the assistant message id in order', async () => {
    respondWith(['2', '+', '2', ' is ', '4']);

    const { frames, result } = await collectStream(request());

    expect(eventNames(frames)).toEqual([
      'user-message-created',
      'token',
      'token',
      'token',
      'token',
      'token',
      'usage',
      'assistant-message-created',
    ]);
    expect(result).toEqual({
      conversationId: CONVERSATION_ID,
      userMessageId: USER_MESSAGE_ID,
      assistantMessageId: ASSISTANT_MESSAGE_ID,
    });
  });

  it('announces a newly created conversation before the user message', async () => {
    conversationRepo.createTx.mockResolvedValue(fromPartial({ id: CONVERSATION_ID }));

    const { frames } = await collectStream(request({ conversationId: undefined }));

    expect(eventNames(frames)[0]).toBe('conversation-created');
  });

  it('does not announce a conversation when continuing an existing one', async () => {
    const { frames } = await collectStream(request());

    expect(eventNames(frames)).not.toContain('conversation-created');
  });

  it('persists the full assembled response, not the individual tokens', async () => {
    respondWith(['Hello', ', ', 'world']);

    await collectStream(request());

    expect(mockedMessageService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant', content: 'Hello, world' }),
      'anonymous',
    );
  });

  it('records the reported total token count against the assistant message', async () => {
    respondWith(['hi'], { promptTokens: 11, completionTokens: 4, totalTokens: 15 });

    await collectStream(request());

    expect(mockedMessageService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ tokenCount: 15 }),
      'anonymous',
    );
  });

  it('passes prior turns to the model oldest-first, excluding the new message', async () => {
    messageRepo.findByConversationId.mockResolvedValue(
      fromPartial([
        { id: 'newer', role: 'assistant', content: 'second' },
        { id: 'older', role: 'user', content: 'first' },
        { id: USER_MESSAGE_ID, role: 'user', content: 'what is 2+2?' },
      ]),
    );

    await collectStream(request());

    expect(mockedStreamChat.mock.calls[0]?.[0].history).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
    ]);
  });

  it('sends the system prompt and the resolved provider to the model', async () => {
    await collectStream(request());

    const config = mockedStreamChat.mock.calls[0]![0];
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o-mini');
    expect(config.systemPrompt).toContain('Nebula Chat');
  });

  it('emits an error frame and no result when the model is unsupported', async () => {
    const { frames, result } = await collectStream(request({ model: 'not-a-model' }));

    expect(errorFrame(frames)).toEqual({
      success: false,
      error: 'BadRequest',
      message: 'Unsupported model: not-a-model',
    });
    expect(result).toBeUndefined();
  });

  it('emits an error frame when more than one message is supplied', async () => {
    const { joined } = await collectStream(
      request({
        messages: [
          { role: 'user', content: 'one' },
          { role: 'user', content: 'two' },
        ],
      } as Partial<CreateChatStreamDTO>),
    );

    expect(joined).toContain('Expected one message, received 2.');
    expect(joined).toContain('"error":"BadRequest"');
  });

  it('emits an error frame when the assistant produces nothing', async () => {
    respondWith(['   ']);

    const { frames, result } = await collectStream(request());

    expect(errorFrame(frames)).toMatchObject({ error: 'Internal', message: GENERIC_ERROR_MESSAGE });
    expect(result).toBeUndefined();
    expect(mockedMessageService.createMessage).not.toHaveBeenCalled();
  });

  it('reports an unclassified LLM failure as Internal without leaking its message', async () => {
    mockedStreamChat.mockRejectedValue(new Error('401 Incorrect API key provided: sk-abc'));

    const { frames, joined } = await collectStream(request());

    expect(errorFrame(frames)).toEqual({
      success: false,
      error: 'Internal',
      message: GENERIC_ERROR_MESSAGE,
    });
    expect(joined).not.toContain('sk-abc');
  });

  it('reports a non-Error failure as Internal', async () => {
    mockedStreamChat.mockRejectedValue('a bare string');

    const { frames, joined } = await collectStream(request());

    expect(errorFrame(frames)).toMatchObject({ error: 'Internal', message: GENERIC_ERROR_MESSAGE });
    expect(joined).not.toContain('a bare string');
  });

  it('surfaces a missing conversation as an error frame rather than throwing', async () => {
    conversationRepo.findByIdSimple.mockResolvedValue(fromPartial(null));

    const { frames, result } = await collectStream(request());

    expect(errorFrame(frames)).toEqual({
      success: false,
      error: 'NotFound',
      message: `Conversation with id "${CONVERSATION_ID}" not found`,
    });
    expect(result).toBeUndefined();
  });

  it('rate-limits a single user after the configured burst', async () => {
    const userId = `burst-${Date.now()}`;
    let lastFrames: string[] = [];

    // The limiter allows 20 requests per minute per user.
    for (let i = 0; i < 21; i++) {
      lastFrames = (await collectStream(request(), userId)).frames;
    }

    expect(errorFrame(lastFrames)).toMatchObject({
      success: false,
      error: 'TooManyRequests',
      message: expect.stringContaining('Rate limit exceeded'),
    });
  });

  it('does not call the model at all once rate-limited', async () => {
    const userId = `blocked-${Date.now()}`;
    for (let i = 0; i < 20; i++) await collectStream(request(), userId);
    vi.clearAllMocks();
    respondWith(['x']);

    await collectStream(request(), userId);

    expect(mockedStreamChat).not.toHaveBeenCalled();
  });

  it('tracks rate limits per user rather than globally', async () => {
    const noisy = `noisy-${Date.now()}`;
    for (let i = 0; i < 21; i++) await collectStream(request(), noisy);

    const { joined } = await collectStream(request(), `quiet-${Date.now()}`);

    expect(joined).not.toContain('Rate limit exceeded');
  });
});
