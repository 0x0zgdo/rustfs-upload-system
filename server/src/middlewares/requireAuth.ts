import { Request, Response, NextFunction } from 'express';

// Extend express-session types to include userId
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
