import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Volume2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { TrustedOrder, InterpretedIntention, IntentMatchResult } from '../types';
import { VoiceOrTextInput } from '../components/VoiceOrTextInput';
import { DemoBadge } from '../components/DemoBadge';
import { useAccessibility } from '../context/AccessibilityContext';
import { ApiClient } from '../services/apiClient';

interface IntentReviewFlowProps {
  order: TrustedOrder;
  onProceedToCheckout: (order: TrustedOrder, intention: InterpretedIntention, matchResult: IntentMatchResult) => void;
  onBackToOrders: () => void;
  onCancel: () => void;
}

export const IntentReviewFlow: React.FC<IntentReviewFlowProps> = ({
  order,
  onProceedToCheckout,
  onBackToOrders,
  onCancel,
}) => {
  const { speak, announce } = useAccessibility();
  const [userIntentionText, setUserIntentionText] = useState<string>('');
  const [interpretedIntention, setInterpretedIntention] = useState<InterpretedIntention | null>(null);
  const [matchResult, setMatchResult] = useState<IntentMatchResult | null>(null);
  const [evaluationSource, setEvaluationSource] = useState<'server' | 'client_fallback'>('client_fallback');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [hasConfirmedReview, setHasConfirmedReview] = useState<boolean>(false);

  // Read instructions on load
  useEffect(() => {
    const prompt = `Selected order is ${order.merchantName} for ${order.currency} ${order.amountDisplay}. Please speak or type your payment intention to verify safety.`;
    announce(prompt);
  }, [order, announce]);

  const handleIntentionSubmit = async (text: string) => {
    setIsEvaluating(true);
    setUserIntentionText(text);
    setHasConfirmedReview(false);

    try {
      const { result, intention, source } = await ApiClient.evaluateIntent(order.id, text, order);

      setInterpretedIntention(intention);
      setMatchResult(result);
      setEvaluationSource(source);

      // Announce and speak outcome
      announce(result.userExplanation, result.outcome === 'MATCH' ? 'polite' : 'assertive');
      speak(result.userExplanation);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReadDetailsAloud = () => {
    if (!matchResult) return;
    const text = `Trusted merchant: ${order.merchantName}. Trusted order reference: ${order.orderReference}. Amount: ${order.currency} ${order.amountDisplay}. Safety decision: ${matchResult.outcome}. ${matchResult.userExplanation}`;
    speak(text);
  };

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <main id="main-content" tabIndex={-1}>
        {/* Navigation Breadcrumb / Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={onBackToOrders}
            style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}
            aria-label="Back to order selection"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Change Order</span>
          </button>
          <DemoBadge />
        </div>

        {/* Selected Trusted Order Summary Card */}
        <div className="card" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trusted Order to Verify
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.2rem 0' }}>
                {order.merchantName}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Order Ref: <strong>{order.orderReference}</strong> • {order.description}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>
                {order.currency} {order.amountDisplay}
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                Authoritative Record
              </span>
            </div>
          </div>
        </div>

        {/* Input Stage: Express Intention */}
        <section aria-labelledby="input-heading">
          <h2 id="input-heading" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Stage 2: Express Your Payment Intention
          </h2>
          <VoiceOrTextInput
            initialValue={userIntentionText}
            onSubmit={handleIntentionSubmit}
            isLoading={isEvaluating}
          />
        </section>

        {/* Evaluation & Review Stage */}
        {matchResult && interpretedIntention && (
          <section aria-labelledby="review-heading" style={{ marginTop: '2rem' }}>
            <div className="card" style={{ borderColor: matchResult.outcome === 'MATCH' ? 'var(--status-success-border)' : 'var(--status-danger-border)' }}>
              {/* Header with Safety Outcome Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {matchResult.outcome === 'MATCH' ? (
                    <div style={{ background: 'var(--status-success-bg)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                      <CheckCircle size={28} color="#34d399" aria-hidden="true" />
                    </div>
                  ) : (
                    <div style={{ background: 'var(--status-danger-bg)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                      <AlertTriangle size={28} color="#f87171" aria-hidden="true" />
                    </div>
                  )}
                  <div>
                    <h3 id="review-heading" style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                      Safety Evaluation Result: {matchResult.outcome}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Safety Engine: {evaluationSource === 'server' ? 'Authoritative Express Backend (/api/intent/match)' : 'Client-Side Rule Fallback'}
                    </div>
                  </div>
                </div>

                <span
                  className={`badge ${
                    matchResult.outcome === 'MATCH'
                      ? 'badge-match'
                      : matchResult.outcome === 'BLOCKED'
                      ? 'badge-blocked'
                      : 'badge-clarification'
                  }`}
                  style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}
                >
                  {matchResult.outcome}
                </span>
              </div>

              {/* Safety Explanation Callout */}
              <div
                className={`callout ${
                  matchResult.outcome === 'MATCH'
                    ? 'callout-success'
                    : matchResult.outcome === 'BLOCKED'
                    ? 'callout-danger'
                    : 'callout-warning'
                }`}
                role="status"
              >
                <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0 0 0.5rem 0' }}>
                  {matchResult.outcome === 'MATCH' ? 'Order Verification Successful' : 'Checkout Blocked or Requires Clarification'}
                </p>
                <p style={{ margin: 0 }}>{matchResult.userExplanation}</p>
              </div>

              {/* Side-by-Side Comparison Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', margin: '1.5rem 0' }}>
                {/* Interpreted User Intention */}
                <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    What You Intended (Interpreted)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Merchant: </span>
                      <strong>{interpretedIntention.merchantName || 'Not specified'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Amount: </span>
                      <strong>
                        {interpretedIntention.currency || ''} {interpretedIntention.amount !== undefined ? interpretedIntention.amount.toFixed(2) : 'Not specified'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Raw Speech/Text: </span>
                      <em style={{ color: 'var(--text-secondary)' }}>"{interpretedIntention.rawText}"</em>
                    </div>
                  </div>
                </div>

                {/* Authoritative Order Details */}
                <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Authoritative Backend Order
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Merchant: </span>
                      <strong>{order.merchantName}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Exact Amount: </span>
                      <strong style={{ color: '#38bdf8' }}>
                        {order.currency} {order.amountDisplay}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Order Reference: </span>
                      <code>{order.orderReference}</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explicit User Review Confirmation Checkbox (Only if MATCH) */}
              {matchResult.outcome === 'MATCH' && (
                <div
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #0284c7',
                    marginBottom: '1.5rem',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasConfirmedReview}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasConfirmedReview(checked);
                        announce(checked ? 'Details explicitly confirmed by user.' : 'Confirmation revoked.');
                      }}
                      style={{ width: '22px', height: '22px', marginTop: '2px', flexShrink: 0 }}
                      aria-describedby="explicit-confirm-desc"
                    />
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        I have reviewed the merchant and amount, and confirm this is the exact payment I intend to make.
                      </span>
                      <p id="explicit-confirm-desc" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                        The AI did not authorize this payment. Your explicit confirmation is required before proceeding to PayPal Sandbox.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleReadDetailsAloud}
                    aria-label="Read full payment review details aloud"
                  >
                    <Volume2 size={18} aria-hidden="true" />
                    <span>Read Details Aloud</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={onCancel}
                    aria-label="Cancel current payment flow"
                  >
                    <XCircle size={18} aria-hidden="true" />
                    <span>Cancel Payment</span>
                  </button>
                </div>

                <div>
                  {matchResult.outcome === 'MATCH' ? (
                    <button
                      className="btn btn-success btn-lg"
                      disabled={!hasConfirmedReview}
                      onClick={() => onProceedToCheckout(order, interpretedIntention, matchResult)}
                      aria-label="Confirm Details and Proceed to PayPal Sandbox Checkout"
                    >
                      <span>Proceed to PayPal Sandbox</span>
                      <ArrowRight size={20} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-lg"
                      onClick={() => {
                        setUserIntentionText('');
                        setMatchResult(null);
                        setInterpretedIntention(null);
                        announce('Safety check reset. Please re-enter your intention.');
                      }}
                    >
                      <RefreshCw size={18} aria-hidden="true" />
                      <span>Re-enter Intention</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
