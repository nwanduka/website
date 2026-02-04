// loki-proxy.js
// Simple CORS proxy to forward requests from website to Loki

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3101;
const LOKI_URL = 'http://localhost:3100';

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Proxy POST requests to Loki
app.post('/loki/api/v1/push', async (req, res) => {
  try {
    const response = await fetch(`${LOKI_URL}/loki/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    if (response.ok) {
      console.log('✓ Forwarded logs to Loki');
      res.status(204).send();
    } else {
      const error = await response.text();
      console.error('✗ Loki error:', error);
      res.status(response.status).send(error);
    }
  } catch (error) {
    console.error('✗ Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`CORS proxy running on http://localhost:${PORT}`);
  console.log(`Forwarding to Loki at ${LOKI_URL}`);
});
