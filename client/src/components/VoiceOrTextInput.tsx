import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Edit3, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { AccessibleSpeechRecognizer, isSpeechRecognitionSupported } from '../utils/speech';
import { useAccessibility } from '../context/AccessibilityContext';

interface VoiceOrTextInputProps {
  initialValue?: string;
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

export const VoiceOrTextInput: React.FC<VoiceOrTextInputProps> = ({
  initialValue = '',
  onSubmit,
  isLoading = false,
}) => {
  const { preferences, announce, speak } = useAccessibility();
  const [inputText, setInputText] = useState(initialValue);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState(false);
  const recognizerRef = useRef<AccessibleSpeechRecognizer | null>(null);

  useEffect(() => {
    recognizerRef.current = new AccessibleSpeechRecognizer();
    return () => {
      recognizerRef.current?.abort();
    };
  }, []);

  const handleStartListening = () => {
    setSpeechError(null);
    if (!isSpeechRecognitionSupported()) {
      setSpeechError(
        'Speech recognition is not supported in this browser. Please use the typed input box below.'
      );
      announce('Speech recognition not supported. Please type your intention.', 'assertive');
      return;
    }

    setPermissionNotice(true);
    announce('Starting microphone. Please allow microphone access if prompted, then state your payment intention.');

    recognizerRef.current?.start({
      onStart: () => {
        setIsListening(true);
        setPermissionNotice(false);
        announce('Listening. Please state who you want to pay and the amount.');
      },
      onResult: (transcript, _isFinal) => {
        setInputText(transcript);
      },
      onError: (errMsg, _code) => {
        setIsListening(false);
        setSpeechError(errMsg);
        announce(errMsg, 'assertive');
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  const handleStopListening = () => {
    recognizerRef.current?.stop();
    setIsListening(false);
    announce('Stopped listening. Please review or edit your recognized text.');
    if (inputText.trim()) {
      speak(`You said: ${inputText}. Please confirm or edit before continuing.`);
    }
  };

  const handleCancelListening = () => {
    recognizerRef.current?.abort();
    setIsListening(false);
    announce('Voice input cancelled.');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      announce('Please enter or speak your payment intention before submitting.', 'assertive');
      return;
    }
    onSubmit(inputText.trim());
  };

  return (
    <div className="card" style={{ borderColor: 'var(--border-strong)' }}>
      <form onSubmit={handleFormSubmit}>
        {/* Permission Explanation Note */}
        {permissionNotice && (
          <div className="callout callout-info" role="status">
            <p style={{ fontWeight: 600 }}>Requesting Microphone Access</p>
            <p style={{ fontSize: '0.875rem' }}>
              Your browser may ask for microphone permission. Audio is processed only for speech-to-text recognition and is never stored or transmitted to external advertising networks.
            </p>
          </div>
        )}

        {/* Voice Control Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          {!isListening ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleStartListening}
              disabled={isLoading}
              aria-label="Start listening for voice input"
            >
              <Mic size={22} aria-hidden="true" />
              <span>Start Speaking</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-danger btn-lg recording-pulse"
                onClick={handleStopListening}
                aria-label="Stop listening and keep current text"
              >
                <MicOff size={22} aria-hidden="true" />
                <span>Done Speaking</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelListening}
                aria-label="Cancel voice input"
              >
                Cancel Voice
              </button>
            </>
          )}

          {/* Listening Indicator */}
          {isListening && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--status-danger-border)',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
              role="status"
              aria-live="assertive"
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                }}
                className={preferences.reducedMotion ? '' : 'recording-pulse'}
                aria-hidden="true"
              />
              <span>Listening... Speak your payment intention now.</span>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {speechError && (
          <div className="callout callout-warning" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <div>
              <p style={{ fontWeight: 600 }}>Voice Notice</p>
              <p style={{ fontSize: '0.875rem' }}>{speechError}</p>
            </div>
          </div>
        )}

        {/* Text Area Input (Accessible fallback & editor) */}
        <div className="form-group">
          <label htmlFor="intention-input" className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <Edit3 size={16} style={{ display: 'inline', marginRight: '6px' }} aria-hidden="true" />
              Payment Intention (Spoken or Typed)
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Edit freely before verification
            </span>
          </label>
          <textarea
            id="intention-input"
            rows={3}
            className="textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder='e.g., "I want to pay Maya Stores 500 rupees for my grocery order."'
            aria-describedby="intention-help"
            disabled={isLoading}
          />
          <div id="intention-help" className="form-help">
            State the merchant name, payment amount, and currency. You will review everything before any checkout occurs.
          </div>
        </div>

        {/* Quick Example Chips for Fast Testing */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
            Quick test examples (click or activate to paste):
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', minHeight: '34px' }}
              onClick={() => {
                const text = 'I want to pay Maya Stores 500 rupees.';
                setInputText(text);
                announce(`Loaded example: ${text}`);
              }}
            >
              Exact Match (500 INR)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', minHeight: '34px' }}
              onClick={() => {
                const text = 'I want to pay Maya Stores 800 rupees.';
                setInputText(text);
                announce(`Loaded example: ${text}`);
              }}
            >
              Amount Mismatch (800 INR)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', minHeight: '34px' }}
              onClick={() => {
                const text = 'I want to pay Maya.';
                setInputText(text);
                announce(`Loaded example: ${text}`);
              }}
            >
              Ambiguous (No Amount)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', minHeight: '34px' }}
              onClick={() => {
                const text = 'I want to pay Global Goods 15 dollars for software license.';
                setInputText(text);
                announce(`Loaded example: ${text}`);
              }}
            >
              USD PayPal Test (15 USD)
            </button>
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          {inputText && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setInputText('')}
              disabled={isLoading}
            >
              Clear
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? (
              <>
                <RefreshCw size={20} className="spinning" aria-hidden="true" />
                <span>Interpreting Safety...</span>
              </>
            ) : (
              <>
                <CheckCircle size={20} aria-hidden="true" />
                <span>Verify Payment Safety</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
