import React from 'react';
import { ShieldCheck, HelpCircle, Activity, Settings, Volume2 } from 'lucide-react';
import { DemoBadge } from '../components/DemoBadge';
import { useAccessibility } from '../context/AccessibilityContext';
import { DemoActivityRecord } from '../types';

interface DashboardProps {
  onStartCheck: () => void;
  onNavigate: (tab: string) => void;
  recentActivity: DemoActivityRecord[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartCheck,
  onNavigate,
  recentActivity,
}) => {
  const { setIsSettingsOpen, speak } = useAccessibility();

  const handleReadProcessAloud = () => {
    const text =
      'The PayAble protection lifecycle consists of six steps. Step 1: User expresses payment intention via speech or text. Step 2: AI model interprets merchant, amount, and currency. Step 3: IntentMatch safety engine strictly verifies against trusted order data. Step 4: User reviews details and gives explicit confirmation. Step 5: Isolated PayPal Sandbox test checkout occurs. Step 6: Server verifies transaction capture directly with PayPal before displaying the result.';
    speak(text);
  };

  return (
    <div className="container">
      <main id="main-content" tabIndex={-1}>
        {/* Welcome Banner */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', borderColor: 'var(--border-strong)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0 }}>
                Payment Safety Dashboard
              </h1>
              <DemoBadge />
            </div>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', margin: 0 }}>
              Verify payment intentions using natural voice or typed input before money moves. Our deterministic engine catches mismatches, overcharges, and currency conflicts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={onStartCheck}
              aria-label="Start a new Payment Safety Check"
            >
              <ShieldCheck size={22} aria-hidden="true" />
              <span>Start Safety Check</span>
            </button>
          </div>
        </div>

        {/* 6-Step Verification Workflow Explainer */}
        <div className="card" aria-labelledby="workflow-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 id="workflow-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              How PayAble AI Guardian Verifies Your Payment
            </h2>
            <button
              className="btn btn-secondary"
              onClick={handleReadProcessAloud}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
              aria-label="Read verification lifecycle aloud"
            >
              <Volume2 size={16} aria-hidden="true" />
              <span>Read Process Aloud</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.25rem' }}>1. Intention</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You speak or type: <em>"Pay Maya Stores 500 rupees"</em>.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.25rem' }}>2. AI Parsing</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Structured JSON extraction of merchant, amount, currency, and ambiguity flags.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>3. IntentMatch Engine</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Deterministic integer minor-unit check. Blocks on any mismatch.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>4. Explicit Review</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You review the exact verified merchant & amount with audio readout.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.25rem' }}>5. PayPal Sandbox</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Secure server-created test order in isolated PayPal Sandbox.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>6. Server Verification</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Authoritative capture check before confirming transaction status.</p>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Quick Actions & Recent Demo Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Recent Demo Activity */}
          <div className="card" aria-labelledby="activity-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 id="activity-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} aria-hidden="true" />
                Recent Demo Activity
              </h2>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                onClick={() => onNavigate('activity')}
              >
                View All
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No demo transactions or safety checks recorded yet. Start a check above to see records.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentActivity.slice(0, 3).map((item) => (
                  <li
                    key={item.id}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.merchantName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.currency} {item.amountDisplay} • {item.orderReference}
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        item.matchOutcome === 'MATCH'
                          ? 'badge-match'
                          : item.matchOutcome === 'BLOCKED'
                          ? 'badge-blocked'
                          : 'badge-clarification'
                      }`}
                    >
                      {item.matchOutcome}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Accessibility & Safety Quick Hub */}
          <div className="card" aria-labelledby="quick-hub-title">
            <h2 id="quick-hub-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
              Quick Settings & Guidance
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings size={18} aria-hidden="true" />
                <span>Adjust Voice Speed, Contrast, or Font Size</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => onNavigate('help')}
              >
                <HelpCircle size={18} aria-hidden="true" />
                <span>View Voice Command & Keyboard Help</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => onNavigate('privacy')}
              >
                <ShieldCheck size={18} aria-hidden="true" />
                <span>Zero-Trust Security & Privacy Information</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
