// rum-tracker.js
// Browser RUM script: captures accessibility events and sends to Alloy

(function() {
  const ALLOY_URL = 'https://your-alloy-url.onrender.com/rum'; // Update with your Alloy Render URL

  const tracker = {
    sessionId: generateSessionId(),
    eventBuffer: [],

    init() {
      this.detectAssistiveTech();
      this.trackKeyboardNavigation();
      this.trackFocusPatterns();
      this.sendBufferPeriodically();
      console.log('[A11y Tracker] Initialized session:', this.sessionId);
    },

    detectAssistiveTech() {
      const indicators = {
        highContrast: window.matchMedia('(prefers-contrast: high)').matches,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      };
      if (Object.values(indicators).some(v => v)) {
        this.logEvent('assistive_tech_detected', indicators);
      }
    },

    trackKeyboardNavigation() {
      let tabCount = 0;
      let lastTabTime = null;

      document.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
          tabCount++;
          const now = Date.now();
          this.logEvent('keyboard_tab', {
            direction: e.shiftKey ? 'backward' : 'forward',
            tabCount,
            timeSinceLastTab: lastTabTime ? now - lastTabTime : 0,
            targetElement: e.target.tagName.toLowerCase(),
            targetId: e.target.id || 'none',
          });
          lastTabTime = now;
        }

        if (['Enter','Escape','ArrowUp','ArrowDown'].includes(e.key)) {
          this.logEvent('keyboard_action', {
            key: e.key,
            targetElement: e.target.tagName.toLowerCase(),
          });
        }
      });
    },

    trackFocusPatterns() {
      let focusStartTime = null;
      let currentElement = null;

      document.addEventListener('focusin', e => {
        if (currentElement && focusStartTime) {
          const duration = Date.now() - focusStartTime;
          if (duration > 100) {
            this.logEvent('focus_duration', {
              element: currentElement.tagName.toLowerCase(),
              elementId: currentElement.id || 'none',
              duration,
            });
          }
        }
        currentElement = e.target;
        focusStartTime = Date.now();
      });
    },

    logEvent(eventType, data) {
      const timestamp = new Date().toISOString();
      this.eventBuffer.push({ eventType, timestamp, ...data });
    },

    async sendToAlloy() {
      if (!this.eventBuffer.length) return;
      try {
        await fetch(ALLOY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.sessionId, events: this.eventBuffer }),
        });
        this.eventBuffer = [];
      } catch (err) {
        console.error('[A11y Tracker] Failed to send events to Alloy', err);
      }
    },

    sendBufferPeriodically() {
      setInterval(() => this.sendToAlloy(), 10000);
      window.addEventListener('beforeunload', () => this.sendToAlloy());
    },
  };

  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tracker.init());
  } else {
    tracker.init();
  }
})();