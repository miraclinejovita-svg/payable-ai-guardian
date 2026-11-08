import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Web SpeechSynthesis API
class MockSpeechSynthesisUtterance {
  text: string;
  rate: number = 1.0;
  pitch: number = 1.0;
  lang: string = 'en-US';
  onend: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const mockSpeechSynthesis = {
  speak: vi.fn((utterance: MockSpeechSynthesisUtterance) => {
    if (utterance.onend) utterance.onend();
  }),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
};

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: MockSpeechSynthesisUtterance,
  writable: true,
});
