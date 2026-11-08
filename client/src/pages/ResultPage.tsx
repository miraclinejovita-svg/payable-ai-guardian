import React, { useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Home,
  Activity,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { DemoBadge } from '../components/DemoBadge';
import { useAccessibility } from '../context/AccessibilityContext';

interface ResultPageProps {
  outcome: 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'UNKNOWN';
  captureRecord?: any;
  errorMessage?: string;
  onReturnHome: () => void;
  onViewActivity: () => void;
  onRetry: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  outcome,
  captureRecord,
  errorMessage,
  onReturnHome,
  onViewActivity,
  onRetry,
}) => {
  const { speak, announce } = useAccessibility();

  useEffect(() => {
    let msg = '';
    if (outcome === 'COMPLETED') {
      msg = `Payment result: Sandbox Payment Verified for ${captureRecord?.merchantName}, amount ${captureRecord?.currency} ${captureRecord?.amount}. This is a simulated test transaction.`;
    } else if (outcome === 'CANCELLED') {
      msg = 'Payment was cancelled. No funds were captured in this sandbox test.';
    } else if (outcome === 'FAILED') {
      msg = `Payment failed: ${errorMessage || 'Unknown error'}. No funds were charged.`;
    } else {
      msg = 'Payment status needs verification. Do not retry without checking order records.';
    }
    announce(msg, outcome === 'COMPLETED' ? 'polite' : 'assertive');
  }, [outcome, captureRecord, errorMessage, announce]);

  const handleReadResultAloud = () => {
    if (outcome === 'COMPLETED') {
      speak(
        `Sandbox Payment Verified. Merchant: ${captureRecord?.merchantName}. Amount: ${captureRecord?.currency} ${captureRecord?.amount}. Order Reference: ${captureRecord?.orderReference}. Transaction ID: ${captureRecord?.captureId || 'Sandbox Test'}. This was a simulated test transaction.`
      );
    } else if (outcome === 'CANCELLED') {
      speak('Payment cancelled. Your checkout was not processed. No funds were charged.');
    } else {
      speak(`Payment did not complete. Status: ${outcome}. ${errorMessage || ''}`);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '750px' }}>
      <main id="main-content" tabIndex={-1}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderColor: 'var(--border-strong)' }}>
          {/* Status Icon */}
          <div style={{ marginBottom: '1.25rem' }}>
            {outcome === 'COMPLETED' && (
              <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--status-success-bg)', borderRadius: '50%' }}>
                <CheckCircle2 size={54} color="#34d399" aria-hidden="true" />
              </div>
            )}
            {outcome === 'CANCELLED' && (
              <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--status-warning-bg)', borderRadius: '50%' }}>
                <XCircle size={54} color="#f59e0b" aria-hidden="true" />
              </div>
            )}
            {outcome === 'FAILED' && (
              <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--status-danger-bg)', borderRadius: '50%' }}>
                <AlertTriangle size={54} color="#f87171" aria-hidden="true" />
              </div>
            )}
            {outcome === 'UNKNOWN' && (
              <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--status-info-bg)', borderRadius: '50%' }}>
                <HelpCircle size={54} color="#38bdf8" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: '0.5rem' }}>
            {outcome === 'COMPLETED' && 'Sandbox Payment Verified'}
            {outcome === 'CANCELLED' && 'Payment Cancelled'}
            {outcome === 'FAILED' && 'Payment Authorization Failed'}
            {outcome === 'UNKNOWN' && 'Payment Status Needs Verification'}
          </h1>

          <div style={{ marginBottom: '1.5rem' }}>
            <DemoBadge label="PayPal Sandbox Test Result — No Real Money Was Transferred" />
          </div>

          {/* Detailed Summary Box */}
          {outcome === 'COMPLETED' && captureRecord && (
            <div
              style={{
                textAlign: 'left',
                backgroundColor: 'var(--bg-surface)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--status-success-border)',
                marginBottom: '1.75rem',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#a7f3d0' }}>
                Verified Transaction Details:
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Merchant:</span>
                  <div style={{ fontWeight: 600 }}>{captureRecord.merchantName}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Amount:</span>
                  <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.1rem' }}>
                    {captureRecord.currency} {captureRecord.amount}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Order Reference:</span>
                  <div><code>{captureRecord.orderReference}</code></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sandbox Capture ID:</span>
                  <div><code>{captureRecord.captureId}</code></div>
                </div>
              </div>
            </div>
          )}

          {outcome === 'CANCELLED' && (
            <div className="callout callout-warning" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 600 }}>Transaction Was Safely Cancelled</p>
              <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                You chose to cancel this payment or left the checkout flow. No charge was submitted, and the trusted order remains unaltered.
              </p>
            </div>
          )}

          {outcome === 'FAILED' && (
            <div className="callout callout-danger" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 600 }}>Payment Could Not Be Completed</p>
              <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                {errorMessage || 'The PayPal Sandbox rejected the transaction or an unexpected network disruption occurred.'}
              </p>
            </div>
          )}

          {outcome === 'UNKNOWN' && (
            <div className="callout callout-info" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 600 }}>Status Pending Server Verification</p>
              <p style={{ fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                The network connection timed out during capture. To prevent duplicate charges, we do not re-attempt capture until the backend reconciles the order with PayPal.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={handleReadResultAloud}
              aria-label="Read complete result aloud"
            >
              <Volume2 size={18} aria-hidden="true" />
              <span>Read Result Aloud</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={onViewActivity}
              aria-label="View demo activity records"
            >
              <Activity size={18} aria-hidden="true" />
              <span>View Activity Log</span>
            </button>

            {outcome !== 'COMPLETED' && (
              <button
                className="btn btn-primary"
                onClick={onRetry}
                aria-label="Retry payment check"
              >
                <RefreshCw size={18} aria-hidden="true" />
                <span>Try Another Check</span>
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={onReturnHome}
              aria-label="Return to Dashboard"
            >
              <Home size={18} aria-hidden="true" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
