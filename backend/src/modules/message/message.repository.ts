import { prisma } from '@backend/prisma';
import type { Prisma } from 'prisma/generated/prisma/client';
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
  createTx(tx: Prisma.TransactionClient, data: Omit<CreateMessageDTO, 'tokens'> & { tokens?: CreateMessageDTO['tokens'] }) {
    const { conversationId, content, role, model, tokens } = data;
    return tx.message.create({
      data: {
        conversationId,
        content,
        role,
        model,
        ...(tokens !== undefined && { tokens }),
      },
    });
  },
  findByConversationId(conversationId: string, limit?: number) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      ...(limit !== undefined && { take: limit }),
      select: { role: true, content: true, tokens: true },
    });
  },
};
