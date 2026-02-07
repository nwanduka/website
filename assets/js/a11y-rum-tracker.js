// accessibility-rum-tracker.js
// Tracks real user accessibility interactions and sends to Loki

(function() {
  const LOKI_URL = 'https://website-alloy.onrender.com/loki/api/v1/push';
  
  const tracker = {
    sessionId: generateSessionId(),
    eventBuffer: [],
    
    init() {
      console.log('[A11y Tracker] Initialized with session:', this.sessionId);
      this.detectAssistiveTech();
      this.trackKeyboardNavigation();
      this.trackFocusPatterns();
      this.sendBufferPeriodically();
    },
    
    // Detect assistive technology indicators
    detectAssistiveTech() {
      const indicators = {
        highContrast: window.matchMedia('(prefers-contrast: high)').matches,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        forcedColors: window.matchMedia('(forced-colors: active)').matches,
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      };
      
      if (Object.values(indicators).some(v => v)) {
        this.logEvent('assistive_tech_detected', indicators);
      }
    },
    
    // Track keyboard navigation
    trackKeyboardNavigation() {
      let tabCount = 0;
      let lastTabTime = null;
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          tabCount++;
          const now = Date.now();
          const timeSinceLastTab = lastTabTime ? now - lastTabTime : 0;
          
          this.logEvent('keyboard_tab', {
            direction: e.shiftKey ? 'backward' : 'forward',
            tabCount: tabCount,
            timeSinceLastTab: timeSinceLastTab,
            targetElement: e.target.tagName.toLowerCase(),
            targetId: e.target.id || 'none',
          });
          
          lastTabTime = now;
        }
        
        // Track other important navigation keys
        if (['Enter', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          this.logEvent('keyboard_action', {
            key: e.key,
            targetElement: e.target.tagName.toLowerCase(),
          });
        }
      });
    },
    
    // Track focus patterns
    trackFocusPatterns() {
      let focusStartTime = null;
      let currentElement = null;
      
      document.addEventListener('focusin', (e) => {
        // Log previous focus duration if exists
        if (currentElement && focusStartTime) {
          const duration = Date.now() - focusStartTime;
          if (duration > 100) { // Only log meaningful focus times
            this.logEvent('focus_duration', {
              element: currentElement.tagName.toLowerCase(),
              elementId: currentElement.id || 'none',
              duration: duration,
            });
          }
        }
        
        // Start tracking new focus
        currentElement = e.target;
        focusStartTime = Date.now();
      });
    },
    
    // Log an event to buffer
    logEvent(eventType, data) {
      const timestamp = new Date().toISOString();
      const logLine = JSON.stringify({
        eventType,
        sessionId: this.sessionId,
        url: window.location.pathname,
        ...data
      });
      
      this.eventBuffer.push({
        timestamp,
        line: logLine
      });
      
      console.log('[A11y Tracker]', eventType, data);
    },
    
    // Send buffered events to Loki
    async sendToLoki() {
      if (this.eventBuffer.length === 0) return;
      
      const streams = [{
        stream: {
          job: 'accessibility-rum',
          source: 'website',
          page: window.location.pathname
        },
        values: this.eventBuffer.map(e => [
          (new Date(e.timestamp).getTime() * 1000000).toString(), // nanoseconds
          e.line
        ])
      }];
      
      try {
        const response = await fetch(LOKI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ streams })
        });
        
        if (response.ok) {
          console.log('[A11y Tracker] Sent', this.eventBuffer.length, 'events to Loki');
          this.eventBuffer = [];
        } else {
          console.error('[A11y Tracker] Failed to send to Loki:', response.statusText);
        }
      } catch (error) {
        console.error('[A11y Tracker] Error sending to Loki:', error);
      }
    },
    
    // Send buffer periodically
    sendBufferPeriodically() {
      // Send every 10 seconds
      setInterval(() => {
        if (this.eventBuffer.length > 0) {
          this.sendToLoki();
        }
      }, 10000);
      
      // Send on page unload
      window.addEventListener('beforeunload', () => {
        if (this.eventBuffer.length > 0) {
          // Use sendBeacon for reliability on page unload
          const streams = [{
            stream: { job: 'accessibility-rum', source: 'website' },
            values: this.eventBuffer.map(e => [
              (new Date(e.timestamp).getTime() * 1000000).toString(),
              e.line
            ])
          }];
          navigator.sendBeacon(LOKI_URL, JSON.stringify({ streams }));
        }
      });
    }
  };
  
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tracker.init());
  } else {
    tracker.init();
  }
})();
