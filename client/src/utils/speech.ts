// Web Speech API and SpeechSynthesis Utilities with Accessible Fallbacks

// Type declarations for browsers supporting SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string, errorCode: string) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export class AccessibleSpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    if (isSpeechRecognitionSupported()) {
      const SpeechRecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  public get supported(): boolean {
    return this.recognition !== null;
  }

  public get listening(): boolean {
    return this.isListening;
  }

  public start(handlers: SpeechRecognitionHandlers): void {
    if (!this.recognition) {
      handlers.onError?.(
        'Speech recognition is not supported in this browser. Please use the typed input box below.',
        'UNSUPPORTED'
      );
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.recognition.onstart = () => {
      this.isListening = true;
      handlers.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const current = final.trim() ? final.trim() : interim.trim();
      handlers.onResult?.(current, Boolean(final.trim()));
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      let friendlyMessage = 'Could not recognize speech. Please try speaking again or use typed input.';
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        friendlyMessage = 'Microphone permission was denied. Please allow microphone access in your browser or type your intention.';
      } else if (event.error === 'no-speech') {
        friendlyMessage = 'No speech was detected. Please click Start Listening and try speaking clearly.';
      } else if (event.error === 'network') {
        friendlyMessage = 'Speech service network issue. Please check your connection or use typed input.';
      }
      handlers.onError?.(friendlyMessage, event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      handlers.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      this.isListening = false;
      handlers.onError?.(err?.message || 'Failed to start microphone.', 'EXCEPTION');
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // Safe ignore
      }
      this.isListening = false;
    }
  }

  public abort(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch {
        // Safe ignore
      }
      this.isListening = false;
    }
  }
}

// Spoken Output Helper (SpeechSynthesis)
export function speakText(
  text: string,
  options?: { rate?: number; pitch?: number; onEnd?: () => void }
): void {
  if (!isSpeechSynthesisSupported()) return;

  try {
    // Cancel any previous utterance to avoid speech overlap
    window.speechSynthesis.cancel();

    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.lang = 'en-US';

    if (options?.onEnd) {
      utterance.onend = options.onEnd;
    }

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Speech synthesis error:', error);
  }
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Safe ignore
    }
  }
}
