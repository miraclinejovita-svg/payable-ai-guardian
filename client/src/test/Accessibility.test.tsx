import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('PayAble AI Guardian Frontend Accessibility Tests', () => {
  it('renders skip link for keyboard and screen reader users', () => {
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders main application heading and accessible brand title', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1, name: /PayAble AI Guardian/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders clearly labeled demo badge prohibiting real money transactions', () => {
    render(<App />);
    const demoBadges = screen.getAllByText(/PayPal Sandbox/i);
    expect(demoBadges.length).toBeGreaterThan(0);
  });

  it('opens accessibility drawer and toggles high contrast mode', () => {
    render(<App />);
    const a11yButton = screen.getByLabelText(/Open Accessibility & Display Preferences/i);
    fireEvent.click(a11yButton);

    const dialog = screen.getByRole('dialog', { name: /Accessibility and Display Preferences/i });
    expect(dialog).toBeInTheDocument();

    const highContrastCheckbox = screen.getByLabelText(/Enable High Contrast/i);
    fireEvent.click(highContrastCheckbox);

    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('true');
  });

  it('provides polite and assertive screen reader live announcers', () => {
    render(<App />);
    const politeAnnouncer = screen.getByTestId('polite-announcer');
    const assertiveAnnouncer = screen.getByTestId('assertive-announcer');

    expect(politeAnnouncer).toHaveAttribute('aria-live', 'polite');
    expect(assertiveAnnouncer).toHaveAttribute('aria-live', 'assertive');
  });
});
