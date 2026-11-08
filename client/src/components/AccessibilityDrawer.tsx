import React, { useEffect, useRef } from 'react';
import { X, Volume2, Type, Contrast, Eye, Mic, Keyboard } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

export const AccessibilityDrawer: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    preferences,
    updatePreferences,
    speak,
    announce,
  } = useAccessibility();

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      announce('Accessibility settings panel opened. Press escape to close.');
      closeButtonRef.current?.focus();
    }
  }, [isSettingsOpen, announce]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
        announce('Accessibility settings panel closed.');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen, announce]);

  if (!isSettingsOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Accessibility and Display Preferences"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '2px solid var(--border-strong)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Accessibility Settings
        </h2>
        <button
          ref={closeButtonRef}
          onClick={() => setIsSettingsOpen(false)}
          className="btn btn-secondary"
          style={{ minHeight: '40px', padding: '0.4rem 0.6rem' }}
          aria-label="Close settings"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Settings Body */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. Spoken Instructions Toggle */}
        <section aria-labelledby="speech-heading">
          <h3 id="speech-heading" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Volume2 size={18} aria-hidden="true" />
            Spoken Instructions
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Reads instructions, order details, and payment safety checks aloud.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.speechEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                updatePreferences({ speechEnabled: checked });
                if (checked) {
                  speak('Spoken instructions enabled.');
                }
              }}
              style={{ width: '22px', height: '22px' }}
              aria-describedby="speech-heading"
            />
            <span style={{ fontWeight: 600 }}>Enable spoken voice output</span>
          </label>

          {preferences.speechEnabled && (
            <div style={{ marginTop: '1rem', paddingLeft: '1.75rem' }}>
              <label htmlFor="speech-rate-slider" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Speech Rate: <strong>{preferences.speechRate.toFixed(1)}x</strong>
              </label>
              <input
                id="speech-rate-slider"
                type="range"
                min="0.8"
                max="1.5"
                step="0.1"
                value={preferences.speechRate}
                onChange={(e) => updatePreferences({ speechRate: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
                aria-label="Voice reading speed"
              />
              <button
                className="btn btn-secondary"
                style={{ marginTop: '0.5rem', minHeight: '36px', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => speak('This is a test of your configured voice speed.')}
              >
                Test Voice Speed
              </button>
            </div>
          )}
        </section>

        <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

        {/* 2. Text Scaling */}
        <section aria-labelledby="text-size-heading">
          <h3 id="text-size-heading" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Type size={18} aria-hidden="true" />
            Text Size
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Increases font size across all screens for readability.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {(['normal', 'large', 'xlarge'] as const).map((scale) => (
              <button
                key={scale}
                className={`btn ${preferences.textScale === scale ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  updatePreferences({ textScale: scale });
                  announce(`Text size set to ${scale}`);
                }}
                aria-pressed={preferences.textScale === scale}
                style={{ textTransform: 'capitalize' }}
              >
                {scale === 'xlarge' ? 'Extra Large' : scale}
              </button>
            ))}
          </div>
        </section>

        <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

        {/* 3. High Contrast Mode */}
        <section aria-labelledby="contrast-heading">
          <h3 id="contrast-heading" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Contrast size={18} aria-hidden="true" />
            High Contrast Mode
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            High-contrast dark mode exceeding WCAG AAA standards for low vision.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={(e) => {
                const checked = e.target.checked;
                updatePreferences({ highContrast: checked });
                announce(checked ? 'High contrast mode activated' : 'Standard contrast mode activated');
              }}
              style={{ width: '22px', height: '22px' }}
            />
            <span style={{ fontWeight: 600 }}>Enable High Contrast (WCAG AAA)</span>
          </label>
        </section>

        <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

        {/* 4. Reduced Motion */}
        <section aria-labelledby="motion-heading">
          <h3 id="motion-heading" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} aria-hidden="true" />
            Reduced Motion
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Disables pulsing animations and transitions.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.reducedMotion}
              onChange={(e) => {
                const checked = e.target.checked;
                updatePreferences({ reducedMotion: checked });
                announce(checked ? 'Reduced motion enabled' : 'Standard motion enabled');
              }}
              style={{ width: '22px', height: '22px' }}
            />
            <span style={{ fontWeight: 600 }}>Reduce Motion</span>
          </label>
        </section>

        <hr style={{ borderColor: 'var(--border-subtle)', margin: 0 }} />

        {/* 5. Preferred Input Method */}
        <section aria-labelledby="input-method-heading">
          <h3 id="input-method-heading" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Preferred Input Method
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Choose your default mode for expressing payment intentions.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              className={`btn ${preferences.preferredInput === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                updatePreferences({ preferredInput: 'voice' });
                announce('Preferred input set to voice first');
              }}
              aria-pressed={preferences.preferredInput === 'voice'}
            >
              <Mic size={18} aria-hidden="true" />
              <span>Voice First</span>
            </button>
            <button
              className={`btn ${preferences.preferredInput === 'typed' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                updatePreferences({ preferredInput: 'typed' });
                announce('Preferred input set to typing first');
              }}
              aria-pressed={preferences.preferredInput === 'typed'}
            >
              <Keyboard size={18} aria-hidden="true" />
              <span>Typing First</span>
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div style={{ padding: '1.25rem', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => setIsSettingsOpen(false)}
        >
          Done
        </button>
      </div>
    </div>
  );
};
