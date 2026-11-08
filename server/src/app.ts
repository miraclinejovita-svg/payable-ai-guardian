import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { ordersRouter } from './routes/orders.js';
import { intentRouter } from './routes/intent.js';
import { paymentsRouter } from './routes/payments.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body Parsing with 10KB size limit to prevent Denial-of-Service attacks
app.use(express.json({ limit: '10kb' }));

// Rate Limiting on API endpoints
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP address. Please try again later.',
  },
});
app.use('/api', apiLimiter);

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/demo/orders', ordersRouter);
app.use('/api/intent', intentRouter);
app.use('/api/payments', paymentsRouter);

// Catch-all 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested API endpoint does not exist.',
  });
});

// Centralized Error Handler
app.use(errorHandler);
