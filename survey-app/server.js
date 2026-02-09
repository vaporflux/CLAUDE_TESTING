const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use /tmp on Vercel (serverless), local file for development
const IS_VERCEL = process.env.VERCEL === '1';
const DATA_DIR = IS_VERCEL ? '/tmp/survey-data' : path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Client helpers ---

function getClientsFile() {
  return path.join(DATA_DIR, 'clients.json');
}

function getClientResponsesFile(clientId) {
  return path.join(DATA_DIR, `responses-${clientId}.json`);
}

function readClients() {
  try {
    const data = fs.readFileSync(getClientsFile(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeClients(clients) {
  fs.writeFileSync(getClientsFile(), JSON.stringify(clients, null, 2));
}

function readResponses(clientId) {
  try {
    const data = fs.readFileSync(getClientResponsesFile(clientId), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeResponses(clientId, responses) {
  fs.writeFileSync(getClientResponsesFile(clientId), JSON.stringify(responses, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// --- Client CRUD ---

// Create a new client
app.post('/api/clients', (req, res) => {
  const { name, contactName, location } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  const client = {
    id: generateId(),
    name,
    contactName: contactName || '',
    location: location || '',
    createdAt: new Date().toISOString()
  };

  const clients = readClients();
  clients.push(client);
  writeClients(clients);

  // Initialize empty responses file
  writeResponses(client.id, []);

  res.status(201).json(client);
});

// Get all clients
app.get('/api/clients', (req, res) => {
  const clients = readClients();

  // Add response count to each client
  const enriched = clients.map(c => {
    const responses = readResponses(c.id);
    return { ...c, responseCount: responses.length };
  });

  res.json(enriched);
});

// Get a single client
app.get('/api/clients/:clientId', (req, res) => {
  const clients = readClients();
  const client = clients.find(c => c.id === req.params.clientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  const responses = readResponses(client.id);
  res.json({ ...client, responseCount: responses.length });
});

// Delete a client
app.delete('/api/clients/:clientId', (req, res) => {
  let clients = readClients();
  const index = clients.findIndex(c => c.id === req.params.clientId);
  if (index === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }

  clients.splice(index, 1);
  writeClients(clients);

  // Remove responses file
  const file = getClientResponsesFile(req.params.clientId);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }

  res.json({ success: true });
});

// --- Responses (now client-scoped) ---

// Submit a survey response for a client
app.post('/api/clients/:clientId/responses', (req, res) => {
  const clients = readClients();
  const client = clients.find(c => c.id === req.params.clientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const response = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...req.body
  };

  const responses = readResponses(client.id);
  responses.push(response);
  writeResponses(client.id, responses);

  res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
});

// Get all responses for a client
app.get('/api/clients/:clientId/responses', (req, res) => {
  const responses = readResponses(req.params.clientId);
  res.json(responses);
});

// Get aggregated analytics for a client
app.get('/api/clients/:clientId/analytics', (req, res) => {
  const responses = readResponses(req.params.clientId);
  const total = responses.length;

  if (total === 0) {
    return res.json({ total: 0, message: 'No responses yet' });
  }

  // Aggregate satisfaction scores (Q1)
  const satisfactionScores = responses.map(r => r.overallSatisfaction).filter(Boolean);
  const avgSatisfaction = satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;

  // Aggregate AI sentiment (Q2)
  const sentimentCounts = {};
  responses.forEach(r => {
    if (r.aiSentiment) {
      sentimentCounts[r.aiSentiment] = (sentimentCounts[r.aiSentiment] || 0) + 1;
    }
  });

  // Aggregate confidence scores (Q3)
  const confidenceScores = responses.map(r => r.confidenceLevel).filter(Boolean);
  const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

  // Aggregate efficiency belief (Q4)
  const efficiencyCounts = {};
  responses.forEach(r => {
    if (r.efficiencyBelief) {
      efficiencyCounts[r.efficiencyBelief] = (efficiencyCounts[r.efficiencyBelief] || 0) + 1;
    }
  });

  // Aggregate most valuable aspect (Q5)
  const valuableCounts = {};
  responses.forEach(r => {
    if (r.mostValuable) {
      valuableCounts[r.mostValuable] = (valuableCounts[r.mostValuable] || 0) + 1;
    }
  });

  // Aggregate NPS scores (Q6)
  const npsScores = responses.map(r => r.npsScore).filter(Boolean);
  const promoters = npsScores.filter(s => s >= 9).length;
  const detractors = npsScores.filter(s => s <= 6).length;
  const nps = Math.round(((promoters - detractors) / npsScores.length) * 100);

  // Aggregate perception change (Q7)
  const perceptionCounts = {};
  responses.forEach(r => {
    if (r.perceptionChange) {
      perceptionCounts[r.perceptionChange] = (perceptionCounts[r.perceptionChange] || 0) + 1;
    }
  });

  // Aggregate tools excitement (Q8)
  const toolsCounts = {};
  responses.forEach(r => {
    if (r.toolsExcited && Array.isArray(r.toolsExcited)) {
      r.toolsExcited.forEach(tool => {
        toolsCounts[tool] = (toolsCounts[tool] || 0) + 1;
      });
    }
  });

  // Aggregate concerns (Q9)
  const concernsCounts = {};
  responses.forEach(r => {
    if (r.concerns && Array.isArray(r.concerns)) {
      r.concerns.forEach(concern => {
        concernsCounts[concern] = (concernsCounts[concern] || 0) + 1;
      });
    }
  });

  // Collect open comments (Q10)
  const comments = responses.map(r => r.additionalComments).filter(c => c && c.trim());

  // Collect unique dates for multi-day tracking
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
});

// Export responses as CSV for a client
app.get('/api/clients/:clientId/export/csv', (req, res) => {
  const clients = readClients();
  const client = clients.find(c => c.id === req.params.clientId);
  const clientName = client ? client.name.replace(/[^a-zA-Z0-9]/g, '-') : 'unknown';
  const responses = readResponses(req.params.clientId);

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
});

// Clear all responses for a client
app.delete('/api/clients/:clientId/responses', (req, res) => {
  writeResponses(req.params.clientId, []);
  res.json({ success: true, message: 'All responses cleared' });
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
