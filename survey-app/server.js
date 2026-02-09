const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'responses.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read responses from file
function readResponses() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper to write responses to file
function writeResponses(responses) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(responses, null, 2));
}

// Submit a survey response
app.post('/api/responses', (req, res) => {
  const response = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...req.body
  };

  const responses = readResponses();
  responses.push(response);
  writeResponses(responses);

  res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
});

// Get all responses (for dashboard)
app.get('/api/responses', (req, res) => {
  const responses = readResponses();
  res.json(responses);
});

// Get aggregated analytics
app.get('/api/analytics', (req, res) => {
  const responses = readResponses();
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

  res.json({
    total,
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

// Export responses as CSV
app.get('/api/export/csv', (req, res) => {
  const responses = readResponses();

  if (responses.length === 0) {
    return res.status(404).send('No responses to export');
  }

  const headers = [
    'Timestamp', 'Overall Satisfaction', 'AI Sentiment', 'Confidence Level',
    'Efficiency Belief', 'Most Valuable Aspect', 'NPS Score',
    'Perception Change', 'Tools Excited About', 'Concerns', 'Additional Comments'
  ];

  const csvRows = [headers.join(',')];

  responses.forEach(r => {
    const row = [
      r.timestamp,
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
  res.setHeader('Content-Disposition', 'attachment; filename=survey-responses.csv');
  res.send(csvRows.join('\n'));
});

// Clear all responses (admin)
app.delete('/api/responses', (req, res) => {
  writeResponses([]);
  res.json({ success: true, message: 'All responses cleared' });
});

app.listen(PORT, () => {
  console.log(`\n  AI Training Survey App`);
  console.log(`  ======================`);
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Survey page:       http://localhost:${PORT}/survey.html`);
  console.log(`  QR Code page:      http://localhost:${PORT}/index.html`);
  console.log(`  Dashboard:         http://localhost:${PORT}/dashboard.html`);
  console.log(`  Export CSV:        http://localhost:${PORT}/api/export/csv\n`);
});
