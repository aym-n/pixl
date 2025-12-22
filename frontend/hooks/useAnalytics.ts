import { useCallback, useEffect, useRef } from 'react';

interface AnalyticsEvent {
  videoId: string;
  userId: string;
  eventType: 'view' | 'play' | 'pause' | 'seek' | 'complete' | 'quality_change' | 'buffer';
  videoTime: number;
  quality: string;
  bufferDurationMs?: number;
  sessionId: string;
}

export const useAnalytics = (videoId: string) => {
  const sessionId = useRef<string>('');
  const lastEventTime = useRef<number>(0);

  useEffect(() => {
    // Generate session ID once
    sessionId.current = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const trackEvent = useCallback(async (event: Partial<AnalyticsEvent>) => {
    // Debounce events (max 1 per second)
    const now = Date.now();
    if (now - lastEventTime.current < 1000 && event.eventType !== 'complete') {
      return;
    }
    lastEventTime.current = now;

    const fullEvent: AnalyticsEvent = {
      videoId,
      userId: 'anonymous', // Replace with actual user ID when auth is added
      sessionId: sessionId.current,
      ...event,
    } as AnalyticsEvent;

    // print to console for debugging
    console.log('Tracking analytics event:', fullEvent);

    try {
      await fetch('http://localhost:8080/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullEvent),
      });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }, [videoId]);

  return { trackEvent };
};