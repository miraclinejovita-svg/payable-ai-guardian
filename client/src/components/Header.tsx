import React from 'react';
import { ShieldCheck, Settings, VolumeX, HelpCircle, Activity } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { ServiceHealth } from '../types';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  serviceHealth: ServiceHealth;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, serviceHealth }) => {
  const { isSettingsOpen, setIsSettingsOpen, stopSpeech, preferences } = useAccessibility();

  return (
    <header className="header-container" style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
        {/* Brand & Product Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'inherit',
            }}
            aria-label="PayAble AI Guardian - Go to Dashboard"
          >
            <div style={{ background: '#0284c7', padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex' }}>
              <ShieldCheck size={28} color="#ffffff" aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                PayAble AI Guardian
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Voice-First Payment Safety & Intent Verification
              </div>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('dashboard')}
            aria-current={currentTab === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>

          <button
            className={`btn ${currentTab === 'check' || currentTab === 'select-order' || currentTab === 'review' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('select-order')}
            aria-current={currentTab === 'select-order' ? 'page' : undefined}
          >
            Safety Check
          </button>

          <button
            className={`btn ${currentTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('activity')}
            aria-current={currentTab === 'activity' ? 'page' : undefined}
          >
            <Activity size={16} aria-hidden="true" />
            <span>Activity</span>
          </button>

          <button
            className={`btn ${currentTab === 'help' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('help')}
            aria-current={currentTab === 'help' ? 'page' : undefined}
          >
            <HelpCircle size={16} aria-hidden="true" />
            <span>Help</span>
          </button>

          {/* Quick Silence Audio Button (if speech is actively speaking) */}
          {preferences.speechEnabled && (
            <button
              className="btn btn-secondary"
              onClick={stopSpeech}
              title="Silence spoken voice"
              aria-label="Silence audio speech output"
            >
              <VolumeX size={18} aria-hidden="true" />
            </button>
          )}

          {/* Accessibility Settings Drawer Toggle */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            aria-expanded={isSettingsOpen}
            aria-label="Open Accessibility & Display Preferences"
          >
            <Settings size={18} aria-hidden="true" />
            <span>A11y</span>
          </button>
        </nav>
      </div>

      {/* Service Status Bar */}
      <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.35rem 1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Status:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: serviceHealth.server === 'online' ? '#10b981' : '#f59e0b',
              }}
              aria-hidden="true"
            />
            <span>{serviceHealth.server === 'online' ? 'Backend Ready' : 'Standalone Demo Client'}</span>
          </span>

          <span style={{ color: 'var(--border-subtle)' }}>|</span>

          <span>
            AI: {serviceHealth.aiProvider === 'real_gemini' ? 'Gemini 1.5' : serviceHealth.aiProvider === 'real_openai' ? 'OpenAI GPT' : 'Offline Safety Rule Parser'}
          </span>
        </div>

        <div>
          <span className="badge badge-demo" style={{ fontSize: '0.7rem' }}>
            PayPal Sandbox Mode — Test Money Only
          </span>
        </div>
      </div>
    </header>
  );
};
