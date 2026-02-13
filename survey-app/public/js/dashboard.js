// Get client ID from URL
const params = new URLSearchParams(window.location.search);
const clientId = params.get('client');

const COLORS = {
  positive: ['#10b981', '#34d399', '#6ee7b7'],
  neutral: ['#f59e0b', '#fbbf24', '#fcd34d'],
  negative: ['#ef4444', '#f87171', '#fca5a5'],
  palette: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6ee7b7', '#34d399'],
  sentiment: {
    'Very Excited': '#10b981',
    'Optimistic': '#34d399',
    'Curious': '#6366f1',
    'Neutral': '#f59e0b',
    'Concerned': '#f97316',
    'Overwhelmed': '#ef4444'
  },
  perception: {
    'Much More Positive': '#10b981',
    'Somewhat More Positive': '#34d399',
    'No Change': '#f59e0b',
    'Somewhat More Negative': '#f97316',
    'Much More Negative': '#ef4444'
  },
  efficiency: {
    'Strongly Agree': '#10b981',
    'Agree': '#34d399',
    'Neutral': '#f59e0b',
    'Disagree': '#f97316',
    'Strongly Disagree': '#ef4444'
  }
};

let charts = {};

function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

function createBarChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || COLORS.palette,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#94a3b8' },
          grid: { color: 'rgba(148,163,184,0.1)' }
        },
        x: {
          ticks: { color: '#94a3b8', maxRotation: 45 },
          grid: { display: false }
        }
      }
    }
  });
}

function createHorizontalBarChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || COLORS.palette,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#94a3b8' },
          grid: { color: 'rgba(148,163,184,0.1)' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { display: false }
        }
      }
    }
  });
}

function createDoughnutChart(canvasId, labels, data, colorMap) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const bgColors = labels.map((l, i) => (colorMap && colorMap[l]) || COLORS.palette[i % COLORS.palette.length]);

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: '#1a1a2e'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', padding: 12, usePointStyle: true }
        }
      }
    }
  });
}

function generateSummary(data, clientName) {
  const container = document.getElementById('executiveSummary');
  if (!data.total) {
    container.innerHTML = '<p class="no-data">Submit survey responses to generate an executive summary.</p>';
    return;
  }

  const sentimentPositive = ((data.sentimentCounts['Very Excited'] || 0) + (data.sentimentCounts['Optimistic'] || 0));
  const sentimentPctPositive = Math.round((sentimentPositive / data.total) * 100);

  const perceptionPositive = ((data.perceptionCounts['Much More Positive'] || 0) + (data.perceptionCounts['Somewhat More Positive'] || 0));
  const perceptionPctPositive = Math.round((perceptionPositive / data.total) * 100);

  const efficiencyPositive = ((data.efficiencyCounts['Strongly Agree'] || 0) + (data.efficiencyCounts['Agree'] || 0));
  const efficiencyPctPositive = Math.round((efficiencyPositive / data.total) * 100);

  const topTool = Object.entries(data.toolsCounts).sort((a, b) => b[1] - a[1])[0];
  const topConcern = Object.entries(data.concernsCounts)
    .filter(([k]) => k !== 'No Concerns')
    .sort((a, b) => b[1] - a[1])[0];

  let npsLabel = 'needs improvement';
  if (data.nps >= 50) npsLabel = 'excellent';
  else if (data.nps >= 30) npsLabel = 'great';
  else if (data.nps >= 0) npsLabel = 'good';

  let satisfactionLabel = 'below expectations';
  if (data.avgSatisfaction >= 4.5) satisfactionLabel = 'outstanding';
  else if (data.avgSatisfaction >= 4) satisfactionLabel = 'very good';
  else if (data.avgSatisfaction >= 3.5) satisfactionLabel = 'good';
  else if (data.avgSatisfaction >= 3) satisfactionLabel = 'average';

  const daysText = data.trainingDays && data.trainingDays.length > 1
    ? ` across ${data.trainingDays.length} training days (${data.trainingDays.join(', ')})`
    : '';

  const summaryItems = [
    `<strong>${data.total}</strong> attendees completed the survey${daysText} with an average satisfaction rating of <strong>${data.avgSatisfaction}/5</strong> (${satisfactionLabel}).`,
    `<strong>${sentimentPctPositive}%</strong> of attendees report feeling <strong>excited or optimistic</strong> about AI after the training.`,
    `<strong>${perceptionPctPositive}%</strong> say their perception of AI became <strong>more positive</strong> as a result of the session.`,
    `<strong>${efficiencyPctPositive}%</strong> believe AI tools will <strong>improve their job efficiency</strong>.`,
    `The Net Promoter Score is <strong>${data.nps}</strong> (${npsLabel}), indicating ${data.nps >= 0 ? 'attendees would recommend this training.' : 'there is room for improvement.'}`,
    topTool ? `The most-desired AI capability is <strong>${topTool[0]}</strong> (selected by ${topTool[1]} attendees).` : '',
    topConcern ? `The top remaining concern is <strong>${topConcern[0]}</strong> (flagged by ${topConcern[1]} attendees), which may be addressed in follow-up sessions.` : 'Attendees reported minimal remaining concerns about AI.'
  ].filter(Boolean);

  const clientLabel = clientName ? ` at ${clientName}` : '';

  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-metric positive">
        <div class="metric-value">${sentimentPctPositive}%</div>
        <div class="metric-label">Positive Sentiment</div>
      </div>
      <div class="summary-metric ${perceptionPctPositive >= 60 ? 'positive' : perceptionPctPositive >= 40 ? 'neutral' : 'negative'}">
        <div class="metric-value">${perceptionPctPositive}%</div>
        <div class="metric-label">Perception Improved</div>
      </div>
      <div class="summary-metric ${efficiencyPctPositive >= 60 ? 'positive' : efficiencyPctPositive >= 40 ? 'neutral' : 'negative'}">
        <div class="metric-value">${efficiencyPctPositive}%</div>
        <div class="metric-label">Expect Efficiency Gains</div>
      </div>
    </div>
    <ul class="summary-bullets">
      ${summaryItems.map(item => `<li>${item}</li>`).join('')}
    </ul>
    <div class="value-proposition">
      <h4>Value Proposition for Future Clients</h4>
      <p>"Our AI training program${clientLabel} delivers measurable impact: <strong>${sentimentPctPositive}%</strong> of participants leave feeling excited or optimistic about AI, <strong>${efficiencyPctPositive}%</strong> expect real productivity gains, and our NPS of <strong>${data.nps}</strong> reflects ${npsLabel} attendee satisfaction. With an average confidence score of <strong>${data.avgConfidence}/5</strong>, employees walk away ready to put AI to work."</p>
    </div>
  `;
}

let currentClientName = '';

// Extract dominant color from logo and theme the entire dashboard dark
function applyLogoTheme(imgEl) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgEl.naturalWidth || 100;
  canvas.height = imgEl.naturalHeight || 100;
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colorCounts = {};
    const step = 4;

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      if (r > 230 && g > 230 && b > 230) continue;
      if (r < 25 && g < 25 && b < 25) continue;

      const br = Math.round(r / 16) * 16;
      const bg = Math.round(g / 16) * 16;
      const bb = Math.round(b / 16) * 16;
      const key = `${br},${bg},${bb}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return;

    const [r, g, b] = sorted[0][0].split(',').map(Number);
    const root = document.documentElement;

    // Dark page background derived from brand color
    const dr = Math.round(r * 0.08);
    const dg = Math.round(g * 0.08);
    const db = Math.round(b * 0.08);
    const cr = Math.round(r * 0.12);
    const cg = Math.round(g * 0.12);
    const cb = Math.round(b * 0.12);

    root.style.setProperty('--bg-primary', `rgb(${dr+10},${dg+10},${db+12})`);
    root.style.setProperty('--bg-secondary', `rgb(${cr+16},${cg+16},${cb+18})`);
    root.style.setProperty('--bg-card', `rgb(${cr+22},${cg+22},${cb+24})`);
    root.style.setProperty('--text-primary', '#f0f0f2');
    root.style.setProperty('--text-secondary', '#a1a1aa');
    root.style.setProperty('--text-muted', '#71717a');
    root.style.setProperty('--border', `rgba(255,255,255,0.08)`);
    root.style.setProperty('--border-hover', `rgba(255,255,255,0.14)`);
    root.style.setProperty('--shadow-sm', '0 1px 3px rgba(0,0,0,0.3)');
    root.style.setProperty('--shadow', '0 2px 6px rgba(0,0,0,0.3)');

    // Accent from brand color
    root.style.setProperty('--accent', `rgb(${r},${g},${b})`);
    root.style.setProperty('--accent-hover', `rgb(${Math.max(0,r-20)},${Math.max(0,g-20)},${Math.max(0,b-20)})`);
    root.style.setProperty('--accent-light', `rgb(${Math.min(255,r+40)},${Math.min(255,g+40)},${Math.min(255,b+40)})`);
    root.style.setProperty('--accent-subtle', `rgba(${r},${g},${b},0.12)`);
    root.style.setProperty('--accent-border', `rgba(${r},${g},${b},0.25)`);

    // Hero block
    root.style.setProperty('--dash-hero-bg', `linear-gradient(160deg, rgb(${cr+8},${cg+8},${cb+10}), rgb(${dr+6},${dg+6},${db+8}))`);
    root.style.setProperty('--dash-hero-text', '#ffffff');
    root.style.setProperty('--dash-hero-sub', 'rgba(255,255,255,0.55)');

    // Chart label colors for dark bg
    Chart.defaults.color = '#a1a1aa';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  } catch (e) {
    // Canvas tainted or other issue — skip theming
  }
}

async function loadDashboard() {
  if (!clientId) {
    document.getElementById('responseSubtitle').textContent = 'No client selected';
    document.querySelector('.dashboard-container').innerHTML =
      '<div class="no-data"><h2>No client selected</h2><p>Please go to the <a href="index.html">Client Manager</a> and select a client to view their dashboard.</p></div>';
    return;
  }

  try {
    // Load client info (only once)
    if (!currentClientName) {
      const clientRes = await fetch('/api/clients/' + clientId);
      const client = await clientRes.json();
      if (client.name) {
        currentClientName = client.name;
        const hero = document.getElementById('dashHero');
        document.getElementById('dashHeroName').textContent = client.name;
        hero.style.display = 'flex';
        document.title = client.name + ' - Training Dashboard';

        if (client.logoUrl) {
          const logoImg = document.getElementById('dashHeroLogo');
          logoImg.src = client.logoUrl;
          logoImg.alt = client.name;
          logoImg.style.display = 'block';
          logoImg.onload = () => applyLogoTheme(logoImg);
        }
      }
    }

    const res = await fetch('/api/clients/' + clientId + '/analytics');
    const data = await res.json();

    const daysLabel = data.trainingDays && data.trainingDays.length > 0
      ? ` | ${data.trainingDays.length} training day${data.trainingDays.length !== 1 ? 's' : ''}`
      : '';

    document.getElementById('responseSubtitle').textContent =
      data.total ? `${data.total} response${data.total !== 1 ? 's' : ''} collected${daysLabel}` : 'No responses yet';

    // KPIs
    document.getElementById('kpiSatisfaction').textContent = data.avgSatisfaction || '-';
    document.getElementById('kpiNps').textContent = data.nps !== undefined ? data.nps : '-';
    document.getElementById('kpiNpsSub').textContent = data.npsBreakdown
      ? `${data.npsBreakdown.promoters}P / ${data.npsBreakdown.passives}N / ${data.npsBreakdown.detractors}D`
      : '';
    document.getElementById('kpiConfidence').textContent = data.avgConfidence || '-';
    document.getElementById('kpiTotal').textContent = data.total || 0;

    if (!data.total) return;

    destroyCharts();

    // Sentiment chart
    const sentimentLabels = Object.keys(data.sentimentCounts);
    const sentimentData = Object.values(data.sentimentCounts);
    const sentimentColors = sentimentLabels.map(l => COLORS.sentiment[l] || '#6366f1');
    createBarChart('sentimentChart', sentimentLabels, sentimentData, sentimentColors);

    // Perception chart
    const perceptionOrder = ['Much More Positive', 'Somewhat More Positive', 'No Change', 'Somewhat More Negative', 'Much More Negative'];
    const perceptionLabels = perceptionOrder.filter(k => data.perceptionCounts[k]);
    const perceptionData = perceptionLabels.map(k => data.perceptionCounts[k]);
    createDoughnutChart('perceptionChart', perceptionLabels, perceptionData, COLORS.perception);

    // Efficiency chart
    const efficiencyOrder = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'];
    const efficiencyLabels = efficiencyOrder.filter(k => data.efficiencyCounts[k]);
    const efficiencyData = efficiencyLabels.map(k => data.efficiencyCounts[k]);
    createDoughnutChart('efficiencyChart', efficiencyLabels, efficiencyData, COLORS.efficiency);

    // Most valuable chart
    const valuableLabels = Object.keys(data.valuableCounts);
    const valuableData = Object.values(data.valuableCounts);
    createHorizontalBarChart('valuableChart', valuableLabels, valuableData);

    // Tools chart
    const toolsLabels = Object.keys(data.toolsCounts);
    const toolsData = Object.values(data.toolsCounts);
    createHorizontalBarChart('toolsChart', toolsLabels, toolsData, toolsLabels.map((_, i) => COLORS.palette[i % COLORS.palette.length]));

    // Concerns chart
    const concernsLabels = Object.keys(data.concernsCounts);
    const concernsData = Object.values(data.concernsCounts);
    const concernsColors = concernsLabels.map(l => l === 'No Concerns' ? '#10b981' : '#f87171');
    createBarChart('concernsChart', concernsLabels, concernsData, concernsColors);

    // NPS chart
    if (data.npsBreakdown) {
      createDoughnutChart('npsChart',
        ['Promoters (9-10)', 'Passives (7-8)', 'Detractors (1-6)'],
        [data.npsBreakdown.promoters, data.npsBreakdown.passives, data.npsBreakdown.detractors],
        { 'Promoters (9-10)': '#10b981', 'Passives (7-8)': '#f59e0b', 'Detractors (1-6)': '#ef4444' }
      );
    }

    // Comments
    const commentsList = document.getElementById('commentsList');
    if (data.comments && data.comments.length > 0) {
      commentsList.innerHTML = data.comments.map(c =>
        `<div class="comment-item"><span class="comment-quote">"</span>${escapeHtml(c)}<span class="comment-quote">"</span></div>`
      ).join('');
    } else {
      commentsList.innerHTML = '<p class="no-data">No comments yet</p>';
    }

    // Executive Summary
    generateSummary(data, currentClientName);

  } catch (err) {
    document.getElementById('responseSubtitle').textContent = 'Error loading data. Is the server running?';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  // Set up navigation links with client ID
  if (clientId) {
    const qrLink = document.getElementById('qrLink');
    const exportLink = document.getElementById('exportLink');
    if (qrLink) qrLink.href = 'qr.html?client=' + clientId;
    if (exportLink) exportLink.href = '/api/clients/' + clientId + '/export/csv';
  }

  loadDashboard();
  document.getElementById('refreshBtn').addEventListener('click', loadDashboard);
  // Auto-refresh every 10 seconds
  setInterval(loadDashboard, 10000);
});
