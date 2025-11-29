import { prisma } from '@backend/prisma';
import type { CreateConversationDTO } from '@backend/modules/conversation/conversation.types';

export const conversationRepository = {
  create({ title }: CreateConversationDTO) {
    return prisma.conversation.create({
      data: { title },
    });
  },
  findById({ conversationId }: { conversationId: string }) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: true },
    });
  },
  findAll() {
    return prisma.conversation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },
};
