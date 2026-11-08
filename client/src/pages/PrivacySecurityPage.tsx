import React from 'react';
import { Lock, ShieldCheck, ArrowLeft, EyeOff, FileText } from 'lucide-react';
import { DemoBadge } from '../components/DemoBadge';

interface PrivacySecurityPageProps {
  onBack: () => void;
}

export const PrivacySecurityPage: React.FC<PrivacySecurityPageProps> = ({ onBack }) => {
  return (
    <div className="container" style={{ maxWidth: '850px' }}>
      <main id="main-content" tabIndex={-1}>
        <div className="card" style={{ borderColor: 'var(--border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={28} color="#38bdf8" aria-hidden="true" />
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0 }}>
                Privacy & Security Architecture
              </h1>
            </div>
            <DemoBadge />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Zero-Trust AI Principles */}
            <section aria-labelledby="zero-trust-title">
              <h2 id="zero-trust-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="#38bdf8" aria-hidden="true" />
                Zero-Trust AI for Payment Authorization
              </h2>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p>
                  Artificial Intelligence models can hallucinate, be manipulated by adversarial prompt injections, or misunderstand numbers. For this reason, <strong>PayAble AI Guardian enforces strict separation of responsibilities:</strong>
                </p>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  <li><strong>AI's role:</strong> Only natural language understanding (extracting text into structured JSON).</li>
                  <li><strong>AI cannot authorize:</strong> The AI model never decides whether money moves.</li>
                  <li><strong>AI cannot change orders:</strong> The model cannot alter the trusted backend order reference, amount, or currency.</li>
                  <li><strong>Deterministic Engine:</strong> All checks are calculated by our independent TypeScript safety engine using integer minor-unit calculations.</li>
                </ul>
              </div>
            </section>

            {/* What is Stored vs Not Stored */}
            <section aria-labelledby="storage-title">
              <h2 id="storage-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <EyeOff size={20} color="#34d399" aria-hidden="true" />
                Privacy & Data Minimization
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
                <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#f87171' }}>What We NEVER Collect or Store:</strong>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <li>Credit or debit card numbers</li>
                    <li>CVV or security codes</li>
                    <li>PayPal account passwords or tokens</li>
                    <li>Raw voice audio recordings or voiceprints</li>
                    <li>Persistent personal tracking profiles</li>
                  </ul>
                </div>

                <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#34d399' }}>What Is Handled Locally:</strong>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <li>Accessibility settings (speech rate, contrast, font size)</li>
                    <li>Temporary speech-to-text transcript of the current session</li>
                    <li>Local demo activity records for testing verification</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* PayPal Sandbox Boundary */}
            <section aria-labelledby="sandbox-title">
              <h2 id="sandbox-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="#f59e0b" aria-hidden="true" />
                PayPal Sandbox Isolation
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                This application interacts exclusively with the official PayPal REST API Sandbox environment. Real credit cards or live PayPal funds are never charged. Test credentials and secrets remain strictly in backend environment variables and are never bundled into client JavaScript.
              </p>
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
