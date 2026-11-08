import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'PayAble AI Guardian Backend',
    version: '1.0.0',
    phase: 'Phase 3 — Server-Side IntentMatch Engine',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    checks: {
      orderService: 'ready',
      intentMatchEngine: 'ready',
      aiService: env.AI_PROVIDER,
      paypalMode: env.PAYPAL_MODE,
    },
  });
});
