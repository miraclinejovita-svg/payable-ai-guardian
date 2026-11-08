import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env if present
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default('100').transform((val) => parseInt(val, 10)),

  // Optional AI Provider keys (Phase 4)
  AI_PROVIDER: z.enum(['real_gemini', 'real_openai', 'offline_fallback']).default('offline_fallback'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  OPENAI_API_KEY: z.string().optional(),
  AI_TIMEOUT_MS: z.string().default('8000').transform((val) => parseInt(val, 10)),

  // Optional PayPal Sandbox credentials (Phase 5)
  PAYPAL_MODE: z.enum(['sandbox', 'mock']).default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_BASE_URL: z.string().default('https://api-m.sandbox.paypal.com'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('CRITICAL: Invalid environment configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
