import { prisma } from '@backend/prisma';
import type { CreateMessageDTO } from '@backend/types/message.types';

export const messageRepository = {
  create({ conversationId, content, role, tokens }: CreateMessageDTO) {
    return prisma.message.create({
      data: {
        conversationId,
        content,
        role,
        tokens: tokens ?? null,
      },
    });
  },
  findById({ messageId }: { messageId: string }) {
    return prisma.message.findUnique({
      where: { id: messageId },
    });
  },
};
