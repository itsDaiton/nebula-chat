import { prisma } from '@backend/prisma';
import type { CreateMessageDTO, GetMessageParams } from '@backend/modules/message/message.types';

export const messageRepository = {
  create({ conversationId, content, role, model, tokens }: CreateMessageDTO) {
    return prisma.message.create({
      data: {
        conversationId,
        content,
        role,
        model,
        ...(tokens !== undefined && { tokens }),
      },
    });
  },
  findById({ messageId }: GetMessageParams) {
    return prisma.message.findUnique({
      where: { id: messageId },
    });
  },
  findAll() {
    return prisma.message.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },
};
