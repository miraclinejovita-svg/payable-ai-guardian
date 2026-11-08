import React from 'react';
import { Activity, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { DemoActivityRecord } from '../types';
import { DemoBadge } from '../components/DemoBadge';
import { useAccessibility } from '../context/AccessibilityContext';

interface ActivityPageProps {
  activityRecords: DemoActivityRecord[];
  onClearActivity: () => void;
  onBack: () => void;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({
  activityRecords,
  onClearActivity,
  onBack,
}) => {
  const { announce } = useAccessibility();

  const handleClear = () => {
    if (window.confirm('Clear all local demo activity records? This only resets local demo history and does not alter server audit logs.')) {
      onClearActivity();
      announce('Local demo activity history cleared.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <main id="main-content" tabIndex={-1}>
        <div className="card" style={{ borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={24} color="#38bdf8" aria-hidden="true" />
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0 }}>
                  Demo Activity History
                </h1>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Audited records of IntentMatch safety evaluations and verified Sandbox test payments.
              </p>
            </div>
            <DemoBadge />
          </div>

          {/* Privacy Note */}
          <div className="callout callout-info" style={{ fontSize: '0.85rem' }}>
            <strong>Privacy Guarantee:</strong> No raw audio recordings, biometrics, or credit card numbers are ever stored in this activity log.
          </div>

          {/* Records List or Empty State */}
          {activityRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} aria-hidden="true" />
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Demo Records Found</p>
              <p style={{ fontSize: '0.9rem' }}>
                Perform a payment safety check to see audit records appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem 0' }}>
              {activityRecords.map((record) => (
                <div
                  key={record.id}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{record.merchantName}</span>
                        <span
                          className={`badge ${
                            record.matchOutcome === 'MATCH'
                              ? 'badge-match'
                              : record.matchOutcome === 'BLOCKED'
                              ? 'badge-blocked'
                              : 'badge-clarification'
                          }`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          {record.matchOutcome}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Ref: <code>{record.orderReference}</code> • {new Date(record.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#38bdf8' }}>
                        {record.currency} {record.amountDisplay}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Status: <strong>{record.transactionStatus}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {record.details}
                  </div>

                  {record.paypalCaptureId && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Sandbox Capture ID: <code>{record.paypalCaptureId}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onBack}
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Dashboard</span>
            </button>

            {activityRecords.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={handleClear}
                style={{ color: '#f87171' }}
                aria-label="Clear local demo records"
              >
                <Trash2 size={16} aria-hidden="true" />
                <span>Clear Local Demo History</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
