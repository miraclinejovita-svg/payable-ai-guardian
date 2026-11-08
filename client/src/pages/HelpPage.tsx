import React from 'react';
import { HelpCircle, Mic, Keyboard, ShieldAlert, ArrowLeft } from 'lucide-react';
import { DemoBadge } from '../components/DemoBadge';

interface HelpPageProps {
  onBack: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onBack }) => {
  return (
    <div className="container" style={{ maxWidth: '850px' }}>
      <main id="main-content" tabIndex={-1}>
        <div className="card" style={{ borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={28} color="#38bdf8" aria-hidden="true" />
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0 }}>
                Help & Voice Instructions
              </h1>
            </div>
            <DemoBadge />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. How to state an intention */}
            <section aria-labelledby="help-voice-title">
              <h2 id="help-voice-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mic size={20} color="#38bdf8" aria-hidden="true" />
                How to State Your Payment Intention
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                You can speak or type naturally. Mention the merchant name, the amount, and the currency.
              </p>
              <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <strong>Recommended Voice Phrases:</strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  <li><em>"I want to pay Maya Stores 500 rupees for groceries."</em></li>
                  <li><em>"Pay Tech Essentials 1200 rupees."</em></li>
                  <li><em>"I want to pay Global Software 15 dollars."</em></li>
                </ul>
              </div>
            </section>

            {/* 2. What happens if there is a mismatch */}
            <section aria-labelledby="help-mismatch-title">
              <h2 id="help-mismatch-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} color="#f59e0b" aria-hidden="true" />
                What Does a "Blocked Mismatch" Mean?
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                If you intended to pay 500 rupees, but the checkout order is 800 rupees, our <strong>IntentMatch Engine</strong> blocks the checkout immediately. You will hear an explanation and will not be permitted to send money until the conflict is resolved.
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                Matching the amount does not prove the merchant is legitimate, but it prevents you from being overcharged or paying the wrong store.
              </p>
            </section>

            {/* 3. Keyboard & Screen Reader Navigation */}
            <section aria-labelledby="help-a11y-title">
              <h2 id="help-a11y-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Keyboard size={20} color="#10b981" aria-hidden="true" />
                Screen Reader & Keyboard Shortcuts
              </h2>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Tab / Shift+Tab:</strong> Navigate through buttons, inputs, and links in logical order.</li>
                <li><strong>Enter / Space:</strong> Activate buttons, select orders, or toggle options.</li>
                <li><strong>Escape:</strong> Close the Accessibility Settings drawer at any time.</li>
                <li><strong>Skip Link:</strong> Press Tab immediately when the page loads to jump directly to the main content.</li>
                <li><strong>Silence Audio:</strong> Press the Volume icon in the navigation bar to immediately stop any speech reading.</li>
              </ul>
            </section>
          </div>

          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={onBack}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Previous Screen</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
