# Accessibility Monitoring v3

## Setup

1. Copy `.env.example` to `.env` and fill in Loki API key.
2. Install dependencies:
   npm install
3. Start Alloy server:
   npm start
4. Include `rum-tracker.js` in your website pages.
5. Prometheus can scrape Alloy metrics at `http://<your-alloy-url>/metrics`.
6. Grafana dashboards can use:
   - Loki data source for RUM logs
   - Prometheus data source for metrics