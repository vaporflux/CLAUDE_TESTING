const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Detect environment
const IS_VERCEL = process.env.VERCEL === '1';

// --- Storage abstraction ---
// Uses Redis (via ioredis) when REDIS_URL is set, local JSON files otherwise

let redis = null;

if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  let url = process.env.REDIS_URL;
  const useTLS = url.startsWith('rediss://');

  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    ...(useTLS ? { tls: { rejectUnauthorized: false } } : {})
  });
  redis.on('error', (err) => console.error('Redis error:', err.message));
  redis.on('connect', () => console.log('Redis: connected'));
  redis.on('ready', () => console.log('Redis: ready'));
}

// Local file helpers (development only)
const DATA_DIR = path.join(__dirname, 'data');
if (!IS_VERCEL && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLocalFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
  } catch {
    return null;
  }
}

function writeLocalFile(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// Unified storage API
const store = {
  async get(key) {
    if (redis) {
      const val = await redis.get(key);
      if (val === null) return null;
      try { return JSON.parse(val); } catch { return val; }
    }
    return readLocalFile(key + '.json');
  },

  async set(key, value) {
    if (redis) {
      await redis.set(key, JSON.stringify(value));
    } else {
      writeLocalFile(key + '.json', value);
    }
  },

  async del(key) {
    if (redis) {
      await redis.del(key);
    } else {
      const file = path.join(DATA_DIR, key + '.json');
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Health check (for debugging Redis) ---
app.get('/api/health', async (req, res) => {
  const rawUrl = process.env.REDIS_URL || '';
  const status = {
    redis_configured: !!rawUrl,
    redis_url_protocol: rawUrl.split('://')[0] || 'none',
    redis_url_host: rawUrl.includes('@') ? rawUrl.split('@')[1]?.split(':')[0] : 'unknown',
    redis_instance: !!redis,
    redis_status: redis ? redis.status : 'no instance',
    tls_enabled: rawUrl.startsWith('rediss://'),
    environment: IS_VERCEL ? 'vercel' : 'local'
  };

  if (redis) {
    try {
      const pong = await redis.ping();
      status.redis_ping = pong;
      status.connected = true;
    } catch (err) {
      status.redis_ping = 'failed';
      status.redis_error = err.message;
      status.connected = false;
    }
  }

  res.json(status);
});

// --- Client CRUD ---

// Create a new client
app.post('/api/clients', async (req, res) => {
  try {
    const { name, contactName, location, logoData } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const client = {
      id: generateId(),
      name,
      contactName: contactName || '',
      location: location || '',
      logoUrl: '',
      createdAt: new Date().toISOString()
    };

    // Store logo separately in its own key (keeps clients list small)
    if (logoData) {
      await store.set('logo-' + client.id, logoData);
      client.logoUrl = '/api/clients/' + client.id + '/logo';
    }

    const clients = (await store.get('clients')) || [];
    clients.push(client);
    await store.set('clients', clients);

    // Initialize empty responses
    await store.set('responses-' + client.id, []);

    res.status(201).json(client);
  } catch (err) {
    console.error('POST /api/clients error:', err.message);
    res.status(500).json({ error: 'Failed to create client: ' + err.message });
  }
});

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = (await store.get('clients')) || [];

    const enriched = [];
    for (const c of clients) {
      const responses = (await store.get('responses-' + c.id)) || [];
      enriched.push({ ...c, responseCount: responses.length });
    }

    res.json(enriched);
  } catch (err) {
    console.error('GET /api/clients error:', err.message);
    res.status(500).json({ error: 'Failed to load clients: ' + err.message });
  }
});

// Get a single client
app.get('/api/clients/:clientId', async (req, res) => {
  try {
    const clients = (await store.get('clients')) || [];
    const client = clients.find(c => c.id === req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const responses = (await store.get('responses-' + client.id)) || [];
    res.json({ ...client, responseCount: responses.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load client' });
  }
});

// Get client logo
app.get('/api/clients/:clientId/logo', async (req, res) => {
  try {
    const logoData = await store.get('logo-' + req.params.clientId);
    if (!logoData) {
      return res.status(404).send('No logo found');
    }

    // logoData is a data URL like "data:image/png;base64,iVBOR..."
    const matches = logoData.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).send('Invalid logo data');
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    res.status(500).send('Failed to load logo');
  }
});

// Delete a client
app.delete('/api/clients/:clientId', async (req, res) => {
  try {
    const clients = (await store.get('clients')) || [];
    const index = clients.findIndex(c => c.id === req.params.clientId);
    if (index === -1) {
      return res.status(404).json({ error: 'Client not found' });
    }

    clients.splice(index, 1);
    await store.set('clients', clients);
    await store.del('responses-' + req.params.clientId);
    await store.del('logo-' + req.params.clientId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// --- Responses (client-scoped) ---

// Submit a survey response for a client
app.post('/api/clients/:clientId/responses', async (req, res) => {
  try {
    const clients = (await store.get('clients')) || [];
    const client = clients.find(c => c.id === req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const response = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...req.body
    };

    const responses = (await store.get('responses-' + client.id)) || [];
    responses.push(response);
    await store.set('responses-' + client.id, responses);

    res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// Get all responses for a client
app.get('/api/clients/:clientId/responses', async (req, res) => {
  try {
    const responses = (await store.get('responses-' + req.params.clientId)) || [];
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load responses' });
  }
});

// Get aggregated analytics for a client
app.get('/api/clients/:clientId/analytics', async (req, res) => {
  try {
    const responses = (await store.get('responses-' + req.params.clientId)) || [];
    const total = responses.length;

    if (total === 0) {
      return res.json({ total: 0, message: 'No responses yet' });
    }

    const satisfactionScores = responses.map(r => r.overallSatisfaction).filter(Boolean);
    const avgSatisfaction = satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;

    const sentimentCounts = {};
    responses.forEach(r => {
      if (r.aiSentiment) {
        sentimentCounts[r.aiSentiment] = (sentimentCounts[r.aiSentiment] || 0) + 1;
      }
    });

    const confidenceScores = responses.map(r => r.confidenceLevel).filter(Boolean);
    const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

    const efficiencyCounts = {};
    responses.forEach(r => {
      if (r.efficiencyBelief) {
        efficiencyCounts[r.efficiencyBelief] = (efficiencyCounts[r.efficiencyBelief] || 0) + 1;
      }
    });

    const valuableCounts = {};
    responses.forEach(r => {
      if (r.mostValuable) {
        valuableCounts[r.mostValuable] = (valuableCounts[r.mostValuable] || 0) + 1;
      }
    });

    const npsScores = responses.map(r => r.npsScore).filter(Boolean);
    const promoters = npsScores.filter(s => s >= 9).length;
    const detractors = npsScores.filter(s => s <= 6).length;
    const nps = Math.round(((promoters - detractors) / npsScores.length) * 100);

    const perceptionCounts = {};
    responses.forEach(r => {
      if (r.perceptionChange) {
        perceptionCounts[r.perceptionChange] = (perceptionCounts[r.perceptionChange] || 0) + 1;
      }
    });

    const toolsCounts = {};
    responses.forEach(r => {
      if (r.toolsExcited && Array.isArray(r.toolsExcited)) {
        r.toolsExcited.forEach(tool => {
          toolsCounts[tool] = (toolsCounts[tool] || 0) + 1;
        });
      }
    });

    const concernsCounts = {};
    responses.forEach(r => {
      if (r.concerns && Array.isArray(r.concerns)) {
        r.concerns.forEach(concern => {
          concernsCounts[concern] = (concernsCounts[concern] || 0) + 1;
        });
      }
    });

    const comments = responses.map(r => r.additionalComments).filter(c => c && c.trim());
    const trainingDays = [...new Set(responses.map(r => r.timestamp.split('T')[0]))].sort();

    res.json({
      total,
      trainingDays,
      avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
      sentimentCounts,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      efficiencyCounts,
      valuableCounts,
      nps,
      npsBreakdown: { promoters, detractors, passives: npsScores.length - promoters - detractors },
      perceptionCounts,
      toolsCounts,
      concernsCounts,
      comments
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// Export responses as CSV for a client
app.get('/api/clients/:clientId/export/csv', async (req, res) => {
  try {
    const clients = (await store.get('clients')) || [];
    const client = clients.find(c => c.id === req.params.clientId);
    const clientName = client ? client.name.replace(/[^a-zA-Z0-9]/g, '-') : 'unknown';
    const responses = (await store.get('responses-' + req.params.clientId)) || [];

    if (responses.length === 0) {
      return res.status(404).send('No responses to export');
    }

    const headers = [
      'Timestamp', 'Date', 'Overall Satisfaction', 'AI Sentiment', 'Confidence Level',
      'Efficiency Belief', 'Most Valuable Aspect', 'NPS Score',
      'Perception Change', 'Tools Excited About', 'Concerns', 'Additional Comments'
    ];

    const csvRows = [headers.join(',')];

    responses.forEach(r => {
      const row = [
        r.timestamp,
        r.timestamp.split('T')[0],
        r.overallSatisfaction,
        r.aiSentiment,
        r.confidenceLevel,
        r.efficiencyBelief,
        r.mostValuable,
        r.npsScore,
        r.perceptionChange,
        `"${(r.toolsExcited || []).join('; ')}"`,
        `"${(r.concerns || []).join('; ')}"`,
        `"${(r.additionalComments || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=survey-${clientName}.csv`);
    res.send(csvRows.join('\n'));
  } catch (err) {
    res.status(500).send('Failed to export');
  }
});

// Clear all responses for a client
app.delete('/api/clients/:clientId/responses', async (req, res) => {
  try {
    await store.set('responses-' + req.params.clientId, []);
    res.json({ success: true, message: 'All responses cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear responses' });
  }
});

// Only start listening when running locally (not on Vercel)
if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  AI Training Survey App`);
    console.log(`  ======================`);
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`  Manage clients:    http://localhost:${PORT}/`);
    console.log(`  Dashboard example: http://localhost:${PORT}/dashboard.html?client=CLIENT_ID\n`);
  });
}

// Export for Vercel serverless
module.exports = app;
