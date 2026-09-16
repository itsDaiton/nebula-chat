import { HttpResponse, http, type HttpHandler, type JsonBodyType } from 'msw';

/**
 * Orval generates one MSW handler per documented **success** response, matching
 * any origin (`*​/api/...`), so a test never names a host and never restates a
 * path the OpenAPI spec already defines. Import those directly:
 *
 * ```ts
 * import { getListConversationsMockHandler } from '@/libs/api/generated/conversations/conversations.msw';
 * server.use(getListConversationsMockHandler({ conversations, nextCursor: null, hasMore: false }));
 * ```
 *
 * Failure responses have no generated handler, and the two endpoints below are
 * not generated at all — `/api/chat/stream` is excluded from Orval by tag (it
 * streams SSE rather than JSON). This module covers exactly that gap, keeping
 * the origin wildcard in one place.
 */
export const API_ROUTE = {
  conversations: '*/api/conversations',
  conversationsSearch: '*/api/conversations/search',
  conversation: '*/api/conversations/:conversationId',
  chatStream: '*/api/chat/stream',
} as const;

type Method = 'get' | 'post' | 'put' | 'delete';

/** A JSON error response for a route Orval only documents on the happy path. */
export const mockApiError = (
  method: Method,
  route: string,
  status: number,
  body: JsonBodyType = {},
): HttpHandler => http[method](route, () => HttpResponse.json(body, { status }));
