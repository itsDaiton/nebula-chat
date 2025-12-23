import { prisma } from '@backend/prisma';
import type {
  CreateConversationDTO,
  GetConversationParams,
} from '@backend/modules/conversation/conversation.types';

export const conversationRepository = {
  create({ title }: CreateConversationDTO) {
    return prisma.conversation.create({
      data: { title },
    });
  },
  findById({ conversationId }: GetConversationParams) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: true },
    });
  },
  async findAll(limit = 20, cursor?: string) {
    const conversations = await prisma.conversation.findMany({
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, -1) : conversations;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      conversations: items,
      nextCursor,
      hasMore,
    };
  },
};
