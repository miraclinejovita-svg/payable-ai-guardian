import React from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

/**
 * Screen Reader Live Announcer
 * Renders hidden aria-live regions so that blind and visually impaired users
 * receive immediate speech announcements on route changes, safety evaluations,
 * and error messages via JAWS, NVDA, VoiceOver, or TalkBack.
 */
export const LiveAnnouncer: React.FC = () => {
  const { announcement } = useAccessibility();

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="polite-announcer"
      >
        {announcement?.priority === 'polite' ? announcement.text : ''}
      </div>

      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="assertive-announcer"
      >
        {announcement?.priority === 'assertive' ? announcement.text : ''}
      </div>
    </>
  );
};
