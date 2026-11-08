import { env } from '../config/env.js';
import { TrustedOrder } from '../types/index.js';

// Hardcoded official PayPal Sandbox API origin (LIVE HOSTS STRICTLY PROHIBITED)
export const PAYPAL_SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';

/**
 * Validates whether credentials are true configured credentials rather than placeholders.
 *
 * Uses specific placeholder string patterns that only match template values in .env.example,
 * not legitimate credential strings (including test credentials used in unit tests).
 *
 * Intentionally does NOT check for substrings like 'client_id' or 'client_secret' because
 * real sandbox test keys may contain those words as part of a descriptive name.
 */
export function isConfiguredPayPal(clientId?: string, secret?: string): boolean {
  if (!clientId || !secret) return false;
  const c = clientId.toLowerCase();
  const s = secret.toLowerCase();

  // Reject known placeholder template strings from .env.example
  const placeholderPatterns = [
    'your_paypal_sandbox_client_id',
    'your_paypal_sandbox_client_secret',
    'your_paypal_sandbox',
    'your_sandbox_client_id',
    'your_sandbox_client_secret',
    'your_sandbox_',
    'placeholder',
    'changeme',
    '<client_id>',
    '<client_secret>',
  ];

  for (const pattern of placeholderPatterns) {
    if (c.includes(pattern) || s.includes(pattern)) return false;
  }

  // Minimum length sanity check (real PayPal sandbox credentials are 50+ chars,
  // but test keys used in unit tests may be shorter — 15 chars is a reasonable minimum)
  if (clientId.length < 15 || secret.length < 15) return false;

  return true;
}

export interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export interface PayPalCreateOrderResult {
  success: boolean;
  paypalOrderId?: string;
  approveUrl?: string;
  error?: string;
  status?: string;
}

export interface PayPalCaptureResult {
  success: boolean;
  captureId?: string;
  status?: string;
  verifiedAmount?: string;
  verifiedCurrency?: string;
  error?: string;
  isDiscrepancy?: boolean;
  isUncertainOutcome?: boolean;
}

export class PayPalService {
  private static cachedToken: CachedToken | null = null;

  /**
   * Enforces that the API origin is strictly the PayPal Sandbox endpoint.
   */
  private static assertSandboxOrigin(): void {
    if (PAYPAL_SANDBOX_BASE !== 'https://api-m.sandbox.paypal.com') {
      throw new Error('SECURITY VIOLATION: Non-sandbox PayPal host detected. Live payments are forbidden.');
    }
  }

  /**
   * Checks whether the order currency is supported for direct REST API v2 merchant checkout.
   * Official PayPal Policy Note: Effective April 2021, PayPal discontinued domestic INR payments.
   */
  public static isCurrencySupportedForSandbox(currency: string): { supported: boolean; reason?: string } {
    if (currency.toUpperCase() === 'INR') {
      return {
        supported: false,
        reason:
          'PayPal REST API discontinued domestic INR currency processing. To test live PayPal Sandbox checkout, please select Order C (USD 15.00) which is fully enabled for international Sandbox testing.',
      };
    }
    const supportedList = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
    if (!supportedList.includes(currency.toUpperCase())) {
      return {
        supported: false,
        reason: `Currency "${currency}" is not enabled for this PayPal Sandbox checkout demo.`,
      };
    }
    return { supported: true };
  }

  /**
   * Obtains an OAuth 2.0 Bearer access token using server-side client credentials.
   * Caches token with a 60-second safety window before expiration.
   */
  public static async getAccessToken(injectedFetch?: typeof fetch): Promise<string> {
    this.assertSandboxOrigin();

    // Always read credentials live from process.env (env.* is cached at module-load time and
    // won't reflect credentials set in .env after module initialization or in test beforeEach blocks).
    const clientId = process.env.PAYPAL_CLIENT_ID ?? env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? env.PAYPAL_CLIENT_SECRET;

    if (!isConfiguredPayPal(clientId, clientSecret)) {
      throw new Error('PAYPAL_CREDENTIALS_NOT_CONFIGURED: Valid sandbox client ID and secret required in server/.env.');
    }

    // Return cached token if still valid
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return this.cachedToken.accessToken;
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const fetchFn = injectedFetch || fetch;

    const response = await fetchFn(`${PAYPAL_SANDBOX_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`PAYPAL_AUTH_FAILED: OAuth endpoint returned HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data: any = await response.json();
    if (!data.access_token) {
      throw new Error('PAYPAL_AUTH_FAILED: No access token in OAuth response.');
    }

    const expiresInSeconds = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + expiresInSeconds * 1000,
    };

    return this.cachedToken.accessToken;
  }

  /**
   * Creates an order with PayPal using ONLY authoritative server-side order amounts.
   */
  public static async createOrder(
    trustedOrder: TrustedOrder,
    idempotencyKey: string,
    injectedFetch?: typeof fetch
  ): Promise<PayPalCreateOrderResult> {
    this.assertSandboxOrigin();

    // Check currency compatibility
    const currencyCheck = this.isCurrencySupportedForSandbox(trustedOrder.currency);
    if (!currencyCheck.supported) {
      return {
        success: false,
        error: currencyCheck.reason,
      };
    }

    const token = await this.getAccessToken(injectedFetch);
    const fetchFn = injectedFetch || fetch;

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: trustedOrder.orderReference,
          description: trustedOrder.description,
          amount: {
            currency_code: trustedOrder.currency,
            value: trustedOrder.amountDisplay,
          },
        },
      ],
      application_context: {
        brand_name: 'PayAble AI Guardian',
        user_action: 'PAY_NOW',
        landing_page: 'NO_PREFERENCE',
      },
    };

    const response = await fetchFn(`${PAYPAL_SANDBOX_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        error: `PAYPAL_CREATE_ORDER_FAILED: HTTP ${response.status}: ${errText.substring(0, 200)}`,
      };
    }

    const orderData: any = await response.json();
    const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

    return {
      success: true,
      paypalOrderId: orderData.id,
      approveUrl: approveLink,
      status: orderData.status,
    };
  }

  /**
   * Captures payment for an approved PayPal order and verifies amount/currency against trusted data.
   */
  public static async captureOrder(
    paypalOrderId: string,
    trustedOrder: TrustedOrder,
    idempotencyKey: string,
    injectedFetch?: typeof fetch
  ): Promise<PayPalCaptureResult> {
    this.assertSandboxOrigin();

    const token = await this.getAccessToken(injectedFetch);
    const fetchFn = injectedFetch || fetch;

    let response: Response;
    try {
      response = await fetchFn(`${PAYPAL_SANDBOX_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey,
          Prefer: 'return=representation',
        },
        body: '{}',
      });
    } catch (networkErr: any) {
      // Network drop during capture -> Uncertain outcome! Probe remote order status
      console.warn('[PAYPAL WARNING] Network failure during capture request. Attempting reconciliation...');
      return this.reconcileUncertainCapture(paypalOrderId, trustedOrder, injectedFetch);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        error: `PAYPAL_CAPTURE_FAILED: HTTP ${response.status}: ${errText.substring(0, 200)}`,
      };
    }

    const captureData: any = await response.json();
    const captureObj = captureData?.purchase_units?.[0]?.payments?.captures?.[0];

    // Status Verification
    if (captureData.status !== 'COMPLETED' && captureObj?.status !== 'COMPLETED') {
      return {
        success: false,
        status: captureData.status || captureObj?.status || 'UNKNOWN',
        error: `CAPTURE_NOT_COMPLETED: PayPal returned status "${captureData.status || captureObj?.status}".`,
      };
    }

    const capturedValue = captureObj?.amount?.value;
    const capturedCurrency = captureObj?.amount?.currency_code;

    // Discrepancy Verification: Captured amount & currency MUST match trusted order
    if (capturedValue !== trustedOrder.amountDisplay || capturedCurrency !== trustedOrder.currency) {
      return {
        success: false,
        isDiscrepancy: true,
        verifiedAmount: capturedValue,
        verifiedCurrency: capturedCurrency,
        error: `DISCREPANCY_DETECTED: PayPal captured ${capturedCurrency} ${capturedValue}, but trusted order requires ${trustedOrder.currency} ${trustedOrder.amountDisplay}.`,
      };
    }

    return {
      success: true,
      captureId: captureObj?.id,
      status: 'COMPLETED',
      verifiedAmount: capturedValue,
      verifiedCurrency: capturedCurrency,
    };
  }

  /**
   * Probes remote PayPal order status when a capture request experiences a connection timeout.
   */
  public static async reconcileUncertainCapture(
    paypalOrderId: string,
    trustedOrder: TrustedOrder,
    injectedFetch?: typeof fetch
  ): Promise<PayPalCaptureResult> {
    try {
      const token = await this.getAccessToken(injectedFetch);
      const fetchFn = injectedFetch || fetch;

      const response = await fetchFn(`${PAYPAL_SANDBOX_BASE}/v2/checkout/orders/${paypalOrderId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          isUncertainOutcome: true,
          error: 'STATUS_UNKNOWN: Capture connection failed and remote status could not be reconciled. Safe investigation required.',
        };
      }

      const orderData: any = await response.json();
      const captureObj = orderData?.purchase_units?.[0]?.payments?.captures?.[0];

      if (orderData.status === 'COMPLETED' && captureObj?.status === 'COMPLETED') {
        // Capture already settled remotely!
        if (captureObj?.amount?.value === trustedOrder.amountDisplay && captureObj?.amount?.currency_code === trustedOrder.currency) {
          return {
            success: true,
            captureId: captureObj.id,
            status: 'COMPLETED',
            verifiedAmount: captureObj.amount.value,
            verifiedCurrency: captureObj.amount.currency_code,
          };
        }
      }

      return {
        success: false,
        isUncertainOutcome: true,
        status: orderData.status,
        error: `STATUS_UNCERTAIN: PayPal remote order status is "${orderData.status}". Capture is not finalized.`,
      };
    } catch {
      return {
        success: false,
        isUncertainOutcome: true,
        error: 'NETWORK_TIMEOUT_UNRESOLVED: Remote status could not be verified. Do not retry capture.',
      };
    }
  }

  public static clearTokenCacheForTesting(): void {
    this.cachedToken = null;
  }
}
