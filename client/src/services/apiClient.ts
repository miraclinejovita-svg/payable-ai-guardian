import { TrustedOrder, InterpretedIntention, IntentMatchResult, ServiceHealth } from '../types';
import { TRUSTED_DEMO_ORDERS } from './demoOrders';
import { parseIntentOffline, evaluateIntentMatch } from './safetyEngine';

const API_BASE = '/api';

// ─── PayPal-related response shapes ────────────────────────────────────────

export interface PayPalConfig {
  clientId: string;
  mode: 'sandbox';
  isConfigured: boolean;
  message: string;
}

export interface CreatePayPalOrderResult {
  success: boolean;
  paypalOrderId: string;
  approveUrl?: string;
  status: string;
  orderReference: string;
  amountDisplay: string;
  currency: string;
}

export interface CapturePayPalOrderResult {
  success: boolean;
  captureId?: string;
  status: string;
  verifiedAmount?: string;
  verifiedCurrency?: string;
  orderReference?: string;
  merchantName?: string;
  isIdempotentReplay?: boolean;
}

export class ApiClient {
  /**
   * Probes backend health status
   */
  public static async checkHealth(): Promise<ServiceHealth> {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Health probe returned status ${response.status}`);
      }

      const data = await response.json();
      return {
        server: 'online',
        aiProvider: data.checks?.aiService || 'offline_fallback',
        paypalSandbox: 'pending_credentials',
        message: 'Backend API online & IntentMatch engine active',
      };
    } catch {
      return {
        server: 'offline',
        aiProvider: 'offline_fallback',
        paypalSandbox: 'offline',
        message: 'Backend server not detected. Running in client-side demo fallback mode.',
      };
    }
  }

  /**
   * Fetches authoritative demo orders from backend
   */
  public static async getDemoOrders(): Promise<{ orders: TrustedOrder[]; source: 'backend' | 'offline_fallback' }> {
    try {
      const response = await fetch(`${API_BASE}/demo/orders`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Orders fetch failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.orders) && data.orders.length > 0) {
        return { orders: data.orders, source: 'backend' };
      }
      throw new Error('Invalid orders payload from backend');
    } catch (err) {
      console.warn('Backend orders unavailable, using offline fallback orders:', err);
      return { orders: TRUSTED_DEMO_ORDERS, source: 'offline_fallback' };
    }
  }

  /**
   * Evaluates user intention against authoritative order via backend IntentMatch API (/api/intent/verify)
   * Sends ONLY orderId and rawText.
   */
  public static async evaluateIntent(
    orderId: string,
    rawText: string,
    fallbackOrder: TrustedOrder
  ): Promise<{ result: IntentMatchResult; intention: InterpretedIntention; source: 'server' | 'client_fallback' }> {
    try {
      const response = await fetch(`${API_BASE}/intent/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          orderId,
          rawText,
        }),
      });

      const data = await response.json();

      if (response.ok && data.matchResult && data.intention) {
        return {
          result: data.matchResult,
          intention: data.intention,
          source: 'server',
        };
      }

      // If server returned an explicit error (404, 422, 503) with a safety outcome (e.g. BLOCKED or SERVICE_UNAVAILABLE)
      if (data.outcome) {
        return {
          result: data as IntentMatchResult,
          intention: parseIntentOffline(rawText),
          source: 'server',
        };
      }

      throw new Error(`Backend verification failed: HTTP ${response.status}`);
    } catch (error) {
      console.warn('Backend IntentVerify API unavailable, falling back to client-side evaluation:', error);
      const intention = parseIntentOffline(rawText);
      const result = evaluateIntentMatch(intention, fallbackOrder);
      return { result, intention, source: 'client_fallback' };
    }
  }

  // ─── PayPal Sandbox Payment Methods (Phase 5) ───────────────────────────

  /**
   * Fetches the PayPal Sandbox public configuration (Client ID only — secret is never sent to frontend).
   */
  public static async getPayPalConfig(): Promise<PayPalConfig> {
    const response = await fetch(`${API_BASE}/payments/config`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`PayPal config fetch failed: HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Creates a PayPal Sandbox order on the backend using strictly authoritative server-side amounts.
   * Sends ONLY the application orderId and consent metadata — no amounts, currencies, or merchant names.
   * The backend looks up and owns all trusted order details.
   */
  public static async createPayPalOrder(
    orderId: string,
    consentTimestamp: string
  ): Promise<CreatePayPalOrderResult> {
    const response = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        orderId,
        explicitConsent: true,
        consentTimestamp,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Create order failed: HTTP ${response.status}`);
    }
    return data;
  }

  /**
   * Initiates server-side capture for a buyer-approved PayPal order.
   * The backend verifies the amount and currency match trusted records before confirming success.
   */
  public static async capturePayPalOrder(
    orderId: string,
    paypalOrderId: string
  ): Promise<CapturePayPalOrderResult> {
    const response = await fetch(`${API_BASE}/payments/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ orderId, paypalOrderId }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Capture failed: HTTP ${response.status}`);
    }
    return data;
  }

  /**
   * Marks a session as cancelled after buyer exits PayPal checkout.
   */
  public static async cancelPayPalOrder(paypalOrderId: string): Promise<void> {
    await fetch(`${API_BASE}/payments/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalOrderId }),
    });
  }
}
