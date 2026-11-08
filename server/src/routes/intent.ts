import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  IntentMatchRequestSchema,
  IntentMatchEngine,
} from '../services/intentMatch.js';
import { OrderService } from '../services/orderService.js';
import { auditService } from '../services/auditService.js';
import { AiService } from '../services/aiService.js';

export const intentRouter = Router();

// Schema for POST /api/intent/verify (accepts ONLY orderId and rawText)
const IntentVerifyRequestSchema = z.object({
  orderId: z.string().min(1, 'Authoritative orderId is required'),
  rawText: z.string().min(1, 'Raw intention text is required').max(500),
});

// Schema for POST /api/intent/interpret
const IntentInterpretRequestSchema = z.object({
  rawText: z.string().min(1, 'Raw intention text is required').max(500),
});

/**
 * POST /api/intent/verify
 * End-to-end verification endpoint:
 * 1. Accepts ONLY orderId and untrusted rawText.
 * 2. Fetches authoritative order from backend.
 * 3. Interprets raw text via AiService (Gemini structured output or safe labeled fallback).
 * 4. Strictly validates AI output with Zod.
 * 5. Passes interpreted intention to IntentMatchEngine.
 * 6. Records privacy-conscious audit event.
 */
intentRouter.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, rawText } = IntentVerifyRequestSchema.parse(req.body);

    // 1. Fetch authoritative order from backend store (ignores any client amounts)
    const trustedOrder = OrderService.getOrderById(orderId);
    if (!trustedOrder) {
      res.status(404).json({
        outcome: 'BLOCKED',
        orderId,
        reasons: [`Order with ID "${orderId}" does not exist in authoritative backend records.`],
        mismatchedFields: ['unknown_order'],
        userExplanation: 'The requested order could not be found. Checkout is blocked for safety.',
        canProceedToReview: false,
        canProceedToCheckout: false,
        evaluatedAt: new Date().toISOString(),
      });
      return;
    }

    // 2. Call AI interpretation service
    const aiResult = await AiService.interpretIntention(rawText);

    // 3. Handle AI failure or provider timeout safely
    if (!aiResult.success || !aiResult.intention) {
      const outcome = aiResult.error === 'AI_TIMEOUT' ? 'SERVICE_UNAVAILABLE' : 'NEEDS_CLARIFICATION';
      const userExplanation =
        aiResult.error === 'AI_TIMEOUT'
          ? 'The payment safety AI service timed out. Checkout is blocked for your protection. Please try again.'
          : `Unable to safely interpret your payment request: ${aiResult.errorMessage || 'Please clarify your merchant and amount.'}`;

      res.status(aiResult.error === 'AI_TIMEOUT' ? 503 : 422).json({
        outcome,
        orderId: trustedOrder.id,
        orderReference: trustedOrder.orderReference,
        trustedMerchant: trustedOrder.merchantName,
        trustedAmountDisplay: trustedOrder.amountDisplay,
        trustedCurrency: trustedOrder.currency,
        reasons: [aiResult.errorMessage || 'AI interpretation failed.'],
        mismatchedFields: ['ambiguity'],
        userExplanation,
        canProceedToReview: false,
        canProceedToCheckout: false,
        source: aiResult.source,
        evaluatedAt: new Date().toISOString(),
      });
      return;
    }

    // 4. Deterministic evaluation by IntentMatchEngine
    const matchResult = IntentMatchEngine.evaluate(aiResult.intention, trustedOrder);

    // 5. Audit log
    auditService.logEvaluation(trustedOrder.orderReference, matchResult.outcome, matchResult.reasons);

    // 6. Return response
    res.json({
      matchResult,
      intention: aiResult.intention,
      source: aiResult.source,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/intent/interpret
 * Natural-language interpretation only
 */
intentRouter.post('/interpret', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rawText } = IntentInterpretRequestSchema.parse(req.body);
    const aiResult = await AiService.interpretIntention(rawText);

    if (!aiResult.success || !aiResult.intention) {
      res.status(aiResult.error === 'AI_TIMEOUT' ? 503 : 422).json({
        error: aiResult.error || 'AI_INTERPRETATION_FAILED',
        message: aiResult.errorMessage || 'Failed to interpret natural language intention.',
        source: aiResult.source,
      });
      return;
    }

    res.json({
      intention: aiResult.intention,
      source: aiResult.source,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/intent/match
 * Direct intention matching endpoint (useful for deterministic tests & pre-parsed intentions)
 */
intentRouter.post('/match', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = IntentMatchRequestSchema.parse(req.body);
    const { orderId, intention } = parsedBody;

    const trustedOrder = OrderService.getOrderById(orderId);
    if (!trustedOrder) {
      res.status(404).json({
        outcome: 'BLOCKED',
        orderId,
        reasons: [`Order with ID "${orderId}" does not exist in authoritative backend records.`],
        mismatchedFields: ['unknown_order'],
        userExplanation: 'The requested order could not be found. Checkout is blocked for safety.',
        canProceedToReview: false,
        canProceedToCheckout: false,
        evaluatedAt: new Date().toISOString(),
      });
      return;
    }

    const result = IntentMatchEngine.evaluate(intention, trustedOrder);
    auditService.logEvaluation(trustedOrder.orderReference, result.outcome, result.reasons);

    res.json(result);
  } catch (error) {
    next(error);
  }
});
