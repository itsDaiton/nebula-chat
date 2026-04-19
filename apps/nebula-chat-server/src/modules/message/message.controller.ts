import { messageService } from '@backend/modules/message/message.service';
import type { NextFunction, Request, Response } from 'express';
import type { GetMessageParams } from './message.types';

export const messageController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body;
      const message = await messageService.createMessage(input);
      return res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  },
  async get(req: Request<GetMessageParams>, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;
      const message = await messageService.getMessage(messageId);
      return res.status(200).json(message);
    } catch (error) {
      next(error);
    }
  },
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await messageService.getAllMessages();
      return res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  },
};
