import React, { useEffect } from 'react';
import { ShieldAlert, ArrowRight, Settings, HelpCircle, Lock, Play } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { DemoBadge } from '../components/DemoBadge';

interface LaunchScreenProps {
  onGetStarted: () => void;
  onTryDemo: () => void;
  onNavigate: (tab: string) => void;
}

export const LaunchScreen: React.FC<LaunchScreenProps> = ({
  onGetStarted,
  onTryDemo,
  onNavigate,
}) => {
  const { speak, announce, setIsSettingsOpen } = useAccessibility();

  useEffect(() => {
    const welcome =
      'Welcome to PayAble AI Guardian. Voice-first payment safety assistant for blind and visually impaired users. Please select Get Started or Try Demo to begin.';
    announce(welcome);
    speak(welcome);
  }, [announce, speak]);

  return (
    <div className="container" style={{ maxWidth: '800px', paddingTop: '2rem' }}>
      <main id="main-content" tabIndex={-1}>
        {/* Welcome Branding Card */}
        <div className="card" style={{ borderColor: 'var(--border-strong)', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(2, 132, 199, 0.15)', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem' }}>
            <ShieldAlert size={48} color="#38bdf8" aria-hidden="true" />
          </div>

          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            PayAble AI Guardian
          </h1>

          <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto 1.5rem auto' }}>
            A voice-first payment safety assistant designed to make online checkout transparent, understandable, and safe from unexpected charges and amount discrepancies.
          </p>

          <DemoBadge size="lg" label="PayPal Sandbox Demo Mode — Never Use Real Money or Real Cards" />

          {/* Educational Checklist */}
          <div
            style={{
              marginTop: '2rem',
              textAlign: 'left',
              backgroundColor: 'var(--bg-surface)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
            aria-label="Important Safety Notice"
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              How PayAble AI Guardian Protects You:
            </h2>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <li>
                <strong>Voice & Typed Input:</strong> Speak or type your payment intention in everyday language (e.g., <em>"I want to pay Maya Stores 500 rupees"</em>).
              </li>
              <li>
                <strong>AI Natural Language Interpretation:</strong> Interprets the merchant, amount, currency, and checks for ambiguity.
              </li>
              <li>
                <strong>Independent Deterministic Safety Engine:</strong> Matches your intention against trusted backend order details. If the amount or merchant doesn't match, checkout is immediately blocked.
              </li>
              <li>
                <strong>AI Never Authorizes Payments:</strong> The AI model cannot create orders or charge money. You must explicitly review and confirm the details.
              </li>
              <li>
                <strong>Official PayPal Sandbox:</strong> Actual test checkouts run in PayPal's isolated Sandbox with virtual test accounts.
              </li>
            </ul>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={onGetStarted}
              aria-label="Get Started with PayAble AI Guardian"
            >
              <span>Get Started</span>
              <ArrowRight size={20} aria-hidden="true" />
            </button>

            <button
              className="btn btn-secondary btn-lg"
              onClick={onTryDemo}
              aria-label="Try Sample Demo Payment Check"
            >
              <Play size={20} aria-hidden="true" />
              <span>Try Demo Order</span>
            </button>
          </div>

          {/* Secondary Quick Navigation */}
          <div style={{ marginTop: '1.75rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open Accessibility Settings"
            >
              <Settings size={18} aria-hidden="true" />
              <span>Accessibility Settings</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('privacy')}
              aria-label="Read Privacy and Security Guarantees"
            >
              <Lock size={18} aria-hidden="true" />
              <span>Privacy & Security</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('help')}
              aria-label="Open Help and Instructions"
            >
              <HelpCircle size={18} aria-hidden="true" />
              <span>Help & Instructions</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
