/**
 * PaymentProcessPage — Phase 5: Real PayPal Sandbox Checkout
 *
 * SANDBOX NOTICE: All payments processed here use PayPal Sandbox test credentials only.
 * No real money is transferred. This page requires:
 *   - A PayPal Developer sandbox personal test account (buyer)
 *   - Sandbox credentials configured in server/.env
 *   - Only Order C (USD 15.00) supports live Sandbox checkout (INR is discontinued by PayPal REST API)
 *
 * Security model:
 *   - Backend creates the PayPal order using ONLY server-side authoritative amounts
 *   - Frontend sends ONLY the application orderId — never amounts or currencies
 *   - Capture is performed server-to-server and amount/currency are verified against trusted records
 *   - Payment is confirmed only after the backend reports COMPLETED with matching amounts
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2, Lock, AlertTriangle, ArrowLeft, Info, CheckCircle } from 'lucide-react';
import { TrustedOrder, InterpretedIntention, IntentMatchResult } from '../types';
import { DemoBadge } from '../components/DemoBadge';
import { useAccessibility } from '../context/AccessibilityContext';
import { ApiClient, PayPalConfig } from '../services/apiClient';

// ─── Page-level checkout state machine ─────────────────────────────────────

type CheckoutPhase =
  | 'LOADING_CONFIG'      // Fetching PayPal config from backend
  | 'NOT_CONFIGURED'      // Server has no sandbox credentials
  | 'CURRENCY_BLOCKED'    // Order currency not supported (INR)
  | 'CHECKOUT_READY'      // Ready to show PayPal buttons
  | 'CREATING_ORDER'      // Backend is creating the PayPal order
  | 'AWAITING_APPROVAL'   // PayPal buttons rendered — waiting for buyer
  | 'CAPTURING'           // Backend is capturing after buyer approval
  | 'COMPLETED'           // Verified successful capture
  | 'CANCELLED'           // Buyer cancelled in PayPal popup
  | 'FAILED'              // Capture failed or discrepancy
  | 'UNKNOWN';            // Network timeout — uncertain outcome

const PHASE_LABELS: Record<CheckoutPhase, string> = {
  LOADING_CONFIG: 'Loading configuration…',
  NOT_CONFIGURED: 'Setup required',
  CURRENCY_BLOCKED: 'Currency not supported',
  CHECKOUT_READY: 'Ready for checkout',
  CREATING_ORDER: 'Creating secure order…',
  AWAITING_APPROVAL: 'Awaiting your approval',
  CAPTURING: 'Verifying payment…',
  COMPLETED: 'Payment verified',
  CANCELLED: 'Cancelled',
  FAILED: 'Payment failed',
  UNKNOWN: 'Status unknown',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface PaymentProcessPageProps {
  order: TrustedOrder;
  intention: InterpretedIntention;
  matchResult: IntentMatchResult;
  onPaymentSuccess: (captureRecord: any) => void;
  onPaymentCancel: () => void;
  onPaymentFail: (errorMsg: string) => void;
}

// ─── Inner component that renders PayPal buttons ─────────────────────────────
// Must be rendered inside <PayPalScriptProvider>

interface PayPalButtonsWrapperProps {
  order: TrustedOrder;
  onPhaseChange: (phase: CheckoutPhase, message?: string) => void;
  onSuccess: (captureRecord: any) => void;
  onCancel: () => void;
  onFail: (msg: string) => void;
}

const PayPalButtonsWrapper: React.FC<PayPalButtonsWrapperProps> = ({
  order,
  onPhaseChange,
  onSuccess,
  onCancel,
  onFail,
}) => {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer();

  useEffect(() => {
    if (isPending) {
      onPhaseChange('LOADING_CONFIG', 'Loading PayPal Sandbox SDK…');
    } else if (isResolved) {
      onPhaseChange('AWAITING_APPROVAL', 'PayPal Sandbox ready. Click "Pay Now" to open the test checkout.');
    } else if (isRejected) {
      onPhaseChange('FAILED', 'Failed to load PayPal Sandbox SDK. Check your network connection.');
    }
  }, [isPending, isResolved, isRejected, onPhaseChange]);

  const handleCreateOrder = useCallback(async () => {
    onPhaseChange('CREATING_ORDER', 'Creating secure PayPal Sandbox order on the server…');
    const consentTimestamp = new Date().toISOString();
    try {
      const result = await ApiClient.createPayPalOrder(order.id, consentTimestamp);
      // Return the PayPal order ID to the SDK — this is the ONLY value the SDK needs
      return result.paypalOrderId;
    } catch (err: any) {
      const msg = err?.message || 'Failed to create PayPal Sandbox order.';
      onPhaseChange('FAILED', msg);
      onFail(msg);
      throw err; // PayPal SDK needs the rejection to cancel the button interaction
    }
  }, [order.id, onPhaseChange, onFail]);

  const handleApprove = useCallback(async (data: { orderID: string }) => {
    onPhaseChange('CAPTURING', 'Buyer approved. Verifying capture with PayPal on the server…');
    try {
      const captureResult = await ApiClient.capturePayPalOrder(order.id, data.orderID);
      if (captureResult.success && captureResult.status === 'COMPLETED') {
        onPhaseChange('COMPLETED', 'Sandbox payment verified and completed successfully.');
        onSuccess({
          paypalOrderId: data.orderID,
          captureId: captureResult.captureId,
          verifiedAmount: captureResult.verifiedAmount,
          verifiedCurrency: captureResult.verifiedCurrency,
          orderReference: captureResult.orderReference,
          merchantName: captureResult.merchantName,
          status: 'COMPLETED',
          isSimulatedDemo: true, // Sandbox test, not a live payment
          isSandboxTestPayment: true,
          timestamp: new Date().toISOString(),
        });
      } else {
        const msg = `Capture did not complete: status=${captureResult.status}`;
        onPhaseChange('FAILED', msg);
        onFail(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Server capture failed.';
      // If the error mentions UNKNOWN outcome, reflect that state
      if (msg.includes('CAPTURE_STATUS_UNCERTAIN') || msg.includes('UNKNOWN')) {
        onPhaseChange('UNKNOWN', 'Network timeout during capture. Payment status is uncertain — do not retry.');
      } else {
        onPhaseChange('FAILED', msg);
      }
      onFail(msg);
    }
  }, [order.id, onPhaseChange, onSuccess, onFail]);

  const handleCancel = useCallback(async (data: { orderID?: string }) => {
    if (data.orderID) {
      // Best-effort cancel — do not block UI on failure
      ApiClient.cancelPayPalOrder(data.orderID).catch(() => {});
    }
    onPhaseChange('CANCELLED', 'Checkout cancelled. No payment was made.');
    onCancel();
  }, [onPhaseChange, onCancel]);

  const handleError = useCallback((err: Record<string, unknown>) => {
    const msg = String(err?.message || err || 'An error occurred in the PayPal Sandbox checkout.');
    onPhaseChange('FAILED', msg);
    onFail(msg);
  }, [onPhaseChange, onFail]);

  if (isPending) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
        <Loader2 size={28} className="spinning" aria-hidden="true" style={{ margin: '0 auto 0.75rem' }} />
        <p>Loading PayPal Sandbox…</p>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="callout callout-warning" role="alert">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>Failed to load PayPal Sandbox SDK. Check network or credentials.</span>
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
      createOrder={handleCreateOrder}
      onApprove={handleApprove}
      onCancel={handleCancel}
      onError={handleError}
      disabled={false}
    />
  );
};

// ─── Main page component ────────────────────────────────────────────────────

export const PaymentProcessPage: React.FC<PaymentProcessPageProps> = ({
  order,
  intention: _intention,
  matchResult: _matchResult,
  onPaymentSuccess,
  onPaymentCancel,
  onPaymentFail,
}) => {
  const { announce } = useAccessibility();
  const [phase, setPhase] = useState<CheckoutPhase>('LOADING_CONFIG');
  const [statusMessage, setStatusMessage] = useState<string>('Loading PayPal Sandbox configuration…');
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Announce page entry
  useEffect(() => {
    announce(
      `Proceeding to PayPal Sandbox checkout for ${order.merchantName}, ` +
      `${order.currency} ${order.amountDisplay}. This is a sandbox test payment only.`
    );
  }, [order, announce]);

  // Load PayPal config from backend
  useEffect(() => {
    let cancelled = false;
    ApiClient.getPayPalConfig()
      .then((config) => {
        if (cancelled) return;
        setPaypalConfig(config);

        if (!config.isConfigured) {
          setPhase('NOT_CONFIGURED');
          setStatusMessage(config.message);
          return;
        }

        // Check if this order's currency is supported for sandbox checkout
        if (!order.supportsLivePayPalSandbox) {
          setPhase('CURRENCY_BLOCKED');
          setStatusMessage(
            `PayPal REST API v2 discontinued domestic ${order.currency} payments. ` +
            `Only Order C (USD 15.00) can be tested in Sandbox mode.`
          );
          return;
        }

        setPhase('CHECKOUT_READY');
        setStatusMessage('PayPal Sandbox is ready. Review the order details and click Pay Now.');
      })
      .catch((err) => {
        if (cancelled) return;
        setConfigError(String(err?.message || err));
        setPhase('NOT_CONFIGURED');
        setStatusMessage('Could not reach backend to load PayPal configuration. Is the server running?');
      });
    return () => { cancelled = true; };
  }, [order]);

  // Announce phase transitions
  useEffect(() => {
    if (phase !== 'LOADING_CONFIG') {
      announce(`Payment status: ${PHASE_LABELS[phase]}. ${statusMessage}`);
    }
  }, [phase, statusMessage, announce]);

  const handlePhaseChange = useCallback((newPhase: CheckoutPhase, message?: string) => {
    setPhase(newPhase);
    if (message) setStatusMessage(message);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <main id="main-content" tabIndex={-1}>
        <div className="card" style={{ borderColor: 'var(--border-strong)' }}>

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1.25rem',
            flexWrap: 'wrap', gap: '0.75rem'
          }}>
            <div>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0 }}>
                PayPal Sandbox Checkout
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Order: <strong>{order.orderReference}</strong> &nbsp;·&nbsp; Status:{' '}
                <span className="badge badge-info">{PHASE_LABELS[phase]}</span>
              </div>
            </div>
            <DemoBadge />
          </div>

          {/* Sandbox warning banner */}
          <div
            className="callout callout-warning"
            role="note"
            aria-label="Sandbox test environment notice"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>⚠ Sandbox / Test Environment Only</strong>
              <p style={{ margin: '0.3rem 0 0' }}>
                No real money is transferred. Use a PayPal <em>Sandbox personal test account</em> to
                approve the checkout. Do not use your real PayPal login.
              </p>
            </div>
          </div>

          {/* Zero-trust security summary */}
          <div
            className="callout callout-info"
            role="note"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}
          >
            <Lock size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <div style={{ fontSize: '0.875rem' }}>
              <strong>Zero-Trust Payment Architecture:</strong>
              <p style={{ margin: '0.3rem 0 0' }}>
                The backend creates the order using strictly authoritative amounts from server records.
                The frontend never provides amounts or currencies. Capture is verified server-to-server
                before this page reports success.
              </p>
            </div>
          </div>

          {/* Order snapshot */}
          <div style={{
            backgroundColor: 'var(--bg-surface)', padding: '1.25rem',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Merchant
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{order.merchantName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Exact Amount (Server-Authoritative)
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  {order.currency} {order.amountDisplay}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Description
                </span>
                <div style={{ fontSize: '0.9rem' }}>{order.description}</div>
              </div>
            </div>
          </div>

          {/* Status message */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              fontSize: '0.9rem',
              color: phase === 'FAILED' || phase === 'UNKNOWN' ? '#f87171' : 'var(--text-secondary)',
            }}
          >
            {phase === 'LOADING_CONFIG' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} className="spinning" aria-hidden="true" />
                {statusMessage}
              </span>
            )}
            {phase === 'CREATING_ORDER' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} className="spinning" aria-hidden="true" />
                {statusMessage}
              </span>
            )}
            {phase === 'CAPTURING' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} className="spinning" aria-hidden="true" />
                {statusMessage}
              </span>
            )}
            {phase === 'COMPLETED' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80' }}>
                <CheckCircle size={16} aria-hidden="true" />
                {statusMessage}
              </span>
            )}
            {(phase === 'FAILED' || phase === 'UNKNOWN') && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} aria-hidden="true" />
                {statusMessage}
              </span>
            )}
            {!['LOADING_CONFIG', 'CREATING_ORDER', 'CAPTURING', 'COMPLETED', 'FAILED', 'UNKNOWN'].includes(phase) && (
              <span>{statusMessage}</span>
            )}
          </div>

          {/* ── NOT_CONFIGURED state ── */}
          {(phase === 'NOT_CONFIGURED') && (
            <div className="callout callout-warning" role="alert" style={{ marginBottom: '1.5rem' }}>
              <Info size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <div>
                <strong>PayPal Sandbox credentials not configured</strong>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                  To test live sandbox checkout, add your credentials to <code>server/.env</code>:
                </p>
                <pre style={{
                  margin: '0.5rem 0 0', fontSize: '0.78rem', backgroundColor: 'var(--bg-secondary)',
                  padding: '0.75rem', borderRadius: '4px', overflowX: 'auto'
                }}>
{`PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=<your sandbox client id>
PAYPAL_CLIENT_SECRET=<your sandbox client secret>`}
                </pre>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Get credentials at{' '}
                  <a
                    href="https://developer.paypal.com/dashboard/applications/sandbox"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8' }}
                    aria-label="Open PayPal Developer Dashboard (opens in new tab)"
                  >
                    developer.paypal.com/dashboard
                  </a>
                  {configError && <> &nbsp;·&nbsp; <em>Error: {configError}</em></>}
                </p>
              </div>
            </div>
          )}

          {/* ── CURRENCY_BLOCKED state ── */}
          {phase === 'CURRENCY_BLOCKED' && (
            <div className="callout callout-warning" role="alert" style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <div>
                <strong>Currency not supported for Sandbox checkout</strong>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                  {statusMessage}
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                  <strong>To test live Sandbox checkout:</strong> Select{' '}
                  <strong>Order C — Global Software &amp; Tech (USD 15.00)</strong> from the order
                  selection screen.
                </p>
              </div>
            </div>
          )}

          {/* ── PayPal SDK Buttons — only shown when configured + currency supported ── */}
          {paypalConfig?.isConfigured && order.supportsLivePayPalSandbox &&
           phase !== 'COMPLETED' && phase !== 'FAILED' && phase !== 'UNKNOWN' &&
           phase !== 'CANCELLED' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{
                fontSize: '0.82rem', color: 'var(--text-muted)',
                marginBottom: '0.75rem', fontStyle: 'italic'
              }}>
                Use a PayPal <strong>Sandbox personal test account</strong> to complete the checkout.
                Do not use your real PayPal credentials.
              </p>
              <PayPalScriptProvider
                options={{
                  clientId: paypalConfig.clientId,
                  currency: 'USD',
                  intent: 'capture',
                  components: 'buttons',
                }}
              >
                <PayPalButtonsWrapper
                  order={order}
                  onPhaseChange={handlePhaseChange}
                  onSuccess={onPaymentSuccess}
                  onCancel={onPaymentCancel}
                  onFail={onPaymentFail}
                />
              </PayPalScriptProvider>
            </div>
          )}

          {/* ── CANCELLED state note ── */}
          {phase === 'CANCELLED' && (
            <div className="callout callout-info" role="status" style={{ marginBottom: '1.5rem' }}>
              <Info size={18} aria-hidden="true" />
              <span>Checkout was cancelled. No payment was made. You can safely return to the previous screen.</span>
            </div>
          )}

          {/* ── FAILED / UNKNOWN state note ── */}
          {(phase === 'FAILED' || phase === 'UNKNOWN') && (
            <div className="callout callout-warning" role="alert" style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>{phase === 'UNKNOWN' ? 'Payment Status Uncertain' : 'Payment Failed'}</strong>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.875rem' }}>
                  {phase === 'UNKNOWN'
                    ? 'A network timeout occurred during capture. The payment status is uncertain. Do not retry until you have confirmed the status in your PayPal Sandbox dashboard.'
                    : statusMessage}
                </p>
              </div>
            </div>
          )}

          {/* Cancel / Return button */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onPaymentCancel}
              aria-label="Cancel checkout and return to order review"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Cancel &amp; Return to Review</span>
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};
