import { conversationService } from '@backend/modules/conversation/conversation.service';
import type { Request, Response, NextFunction } from 'express';
import type { GetConversationParams } from './conversation.types';

export const conversationController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body;
      const conversation = await conversationService.createConversation(input);
      return res.status(201).json(conversation);
    } catch (error) {
      next(error);
    }
  },
  async get(req: Request<GetConversationParams>, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      const conversation = await conversationService.getConversation(conversationId);
      return res.status(200).json(conversation);
    } catch (error) {
      next(error);
    }
  },
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, cursor } = req.query;
      const result = await conversationService.getAllConversations(
        limit as unknown as number,
        cursor as string | undefined,
      );
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
