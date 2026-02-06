// alloy-server.js
// Alloy server: receives RUM events & axe-core metrics, exposes Prometheus metrics, forwards RUM to Loki

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Registry, Counter } = require('prom-client');

const app = express();
const port = process.env.PORT || 10000;
const LOKI_URL = process.env.LOKI_URL;
const LOKI_API_KEY = process.env.LOKI_API_KEY;

app.use(bodyParser.json({ limit: '1mb' }));

// Prometheus setup
const registry = new Registry();
const eventCounter = new Counter({
  name: 'a11y_events_total',
  help: 'Total number of accessibility events received (RUM + axe-core)',
  labelNames: ['eventType', 'page', 'source'], // source = 'rum' or 'axe'
});
registry.registerMetric(eventCounter);

///////////////////////////////////////////////
// RUM endpoint
///////////////////////////////////////////////
app.post('/rum', async (req, res) => {
  const { sessionId, events } = req.body;
  if (!events || !events.length) return res.status(400).send('No events');

  // Increment Prometheus metrics
  events.forEach(event =>
    eventCounter.labels(event.eventType, event.url || '/', 'rum').inc()
  );

  // Forward to Loki
  const streams = [{
    stream: { job: 'accessibility-rum', source: 'website' },
    values: events.map(e => [
      (new Date(e.timestamp).getTime() * 1000000).toString(), // nanoseconds
      JSON.stringify({ sessionId, ...e })
    ])
  }];

  try {
    await axios.post(LOKI_URL, { streams }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(LOKI_API_KEY + ':').toString('base64')}`
      }
    });
    res.status(200).send('RUM events received');
  } catch (err) {
    console.error('Failed to send RUM to Loki:', err);
    res.status(500).send('Failed to forward RUM to Loki');
  }
});

///////////////////////////////////////////////
// Axe-core endpoint
///////////////////////////////////////////////
app.post('/axe', (req, res) => {
  const { metrics } = req.body;
  if (!metrics || !metrics.length) return res.status(400).send('No metrics');

  // Increment Prometheus counters
  // Each metric object: { eventType: 'violation', page: '/about', count: 5 }
  metrics.forEach(m => {
    eventCounter.labels(m.eventType, m.page || '/', 'axe').inc(m.count || 1);
  });

  res.status(200).send('Axe metrics received');
});

///////////////////////////////////////////////
// Prometheus metrics endpoint
///////////////////////////////////////////////
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

///////////////////////////////////////////////
// Start server
///////////////////////////////////////////////
app.listen(port, () => console.log(`[Alloy Server] Listening on port ${port}`));