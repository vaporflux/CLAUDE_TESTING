// Get client ID from URL
const params = new URLSearchParams(window.location.search);
const clientId = params.get('client');

const COLORS = {
  palette: ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#a142f4', '#24c1e0', '#f538a0'],
  sentiment: {
    'Very Excited': '#1e8e3e',
    'Optimistic': '#34a853',
    'Curious': '#4285f4',
    'Neutral': '#f9ab00',
    'Concerned': '#e37400',
    'Overwhelmed': '#d93025'
  },
  perception: {
    'Much More Positive': '#1e8e3e',
    'Somewhat More Positive': '#34a853',
    'No Change': '#f9ab00',
    'Somewhat More Negative': '#e37400',
    'Much More Negative': '#d93025'
  },
  risk: {
    'Much Less Concerned': '#1e8e3e',
    'Better Understanding': '#34a853',
    'Unchanged': '#f9ab00',
    'Slightly More Concerned': '#e37400',
    'Much More Concerned': '#d93025'
  },
  efficiency: {
    'Major Improvement': '#1e8e3e',
    'Significant Improvement': '#34a853',
    'Moderate Improvement': '#4285f4',
    'Slight Improvement': '#f9ab00',
    'No Improvement': '#d93025'
  },
  time: {
    'Already Have': '#1e8e3e',
    'Within a Week': '#34a853',
    'Within a Month': '#4285f4',
    'Within 3 Months': '#f9ab00',
    'Not Sure': '#80868b'
  },
  barrier: {
    'No Barriers': '#1e8e3e',
    'Time Constraints': '#4285f4',
    'Technical Skills': '#f9ab00',
    'Management Support': '#e37400',
    'Compliance Concerns': '#d93025',
    'No Clear Use Case': '#80868b'
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
          ticks: { stepSize: 1, color: '#5f6368' },
          grid: { color: '#e8eaed' }
        },
        x: {
          ticks: { color: '#5f6368', maxRotation: 45 },
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
          ticks: { stepSize: 1, color: '#5f6368' },
          grid: { color: '#e8eaed' }
        },
        y: {
          ticks: { color: '#5f6368' },
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
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#5f6368', padding: 12, usePointStyle: true }
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

  const efficiencyPositive = ((data.efficiencyCounts['Major Improvement'] || 0) + (data.efficiencyCounts['Significant Improvement'] || 0) + (data.efficiencyCounts['Moderate Improvement'] || 0));
  const efficiencyPctPositive = Math.round((efficiencyPositive / data.total) * 100);

  const riskPositive = data.riskCounts ? ((data.riskCounts['Much Less Concerned'] || 0) + (data.riskCounts['Better Understanding'] || 0)) : 0;
  const riskPctPositive = Math.round((riskPositive / data.total) * 100);

  const timeQuick = data.timeCounts ? ((data.timeCounts['Already Have'] || 0) + (data.timeCounts['Within a Week'] || 0)) : 0;
  const timePctQuick = Math.round((timeQuick / data.total) * 100);

  const noBarriers = data.barrierCounts ? (data.barrierCounts['No Barriers'] || 0) : 0;
  const noBarriersPct = Math.round((noBarriers / data.total) * 100);

  // Find top barrier (excluding "No Barriers")
  let topBarrier = '';
  let topBarrierCount = 0;
  if (data.barrierCounts) {
    Object.entries(data.barrierCounts).forEach(([k, v]) => {
      if (k !== 'No Barriers' && v > topBarrierCount) {
        topBarrier = k;
        topBarrierCount = v;
      }
    });
  }

  let npsLabel = 'needs improvement';
  if (data.nps >= 50) npsLabel = 'excellent';
  else if (data.nps >= 30) npsLabel = 'great';
  else if (data.nps >= 0) npsLabel = 'good';

  let valueLabel = 'below expectations';
  if (data.avgSatisfaction >= 4.5) valueLabel = 'outstanding';
  else if (data.avgSatisfaction >= 4) valueLabel = 'very good';
  else if (data.avgSatisfaction >= 3.5) valueLabel = 'good';
  else if (data.avgSatisfaction >= 3) valueLabel = 'average';

  const daysText = data.trainingDays && data.trainingDays.length > 1
    ? ` across ${data.trainingDays.length} training days (${data.trainingDays.join(', ')})`
    : '';

  const summaryItems = [
    `<strong>${data.total}</strong> attendees completed the survey${daysText} with an average training value score of <strong>${data.avgSatisfaction}/5</strong> (${valueLabel}).`,
    `<strong>${sentimentPctPositive}%</strong> of attendees report feeling <strong>excited or optimistic</strong> about AI after the training.`,
    `<strong>${perceptionPctPositive}%</strong> say their attitude toward AI became <strong>more positive</strong> as a result of the session.`,
    `<strong>${riskPctPositive}%</strong> feel <strong>less concerned about AI risks</strong> or better understand how to manage them.`,
    `<strong>${efficiencyPctPositive}%</strong> expect AI to deliver <strong>measurable efficiency gains</strong> within 90 days.`,
    `<strong>${timePctQuick}%</strong> plan to <strong>apply their learnings within a week</strong> or already have.`,
    `<strong>${noBarriersPct}%</strong> of attendees report <strong>no significant barriers</strong> to adopting AI.${topBarrier ? ` The most common barrier is <strong>${topBarrier.toLowerCase()}</strong>.` : ''}`,
    `Average organizational readiness: <strong>${data.avgOrgReadiness}/5</strong>.`,
    `The Net Promoter Score is <strong>${data.nps}</strong> (${npsLabel}), indicating ${data.nps >= 0 ? 'attendees would recommend this training.' : 'there is room for improvement.'}`
  ].filter(Boolean);

  const clientLabel = clientName ? ` at ${clientName}` : '';

  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-metric ${sentimentPctPositive >= 60 ? 'positive' : sentimentPctPositive >= 40 ? 'neutral' : 'negative'}">
        <div class="metric-value">${sentimentPctPositive}%</div>
        <div class="metric-label">Positive Sentiment</div>
      </div>
      <div class="summary-metric ${efficiencyPctPositive >= 60 ? 'positive' : efficiencyPctPositive >= 40 ? 'neutral' : 'negative'}">
        <div class="metric-value">${efficiencyPctPositive}%</div>
        <div class="metric-label">Expect Efficiency Gains</div>
      </div>
      <div class="summary-metric ${noBarriersPct >= 50 ? 'positive' : noBarriersPct >= 30 ? 'neutral' : 'negative'}">
        <div class="metric-value">${noBarriersPct}%</div>
        <div class="metric-label">Adoption Ready</div>
      </div>
    </div>
    <ul class="summary-bullets">
      ${summaryItems.map(item => `<li>${item}</li>`).join('')}
    </ul>
    <div class="value-proposition">
      <h4>Value Proposition for Future Clients</h4>
      <p>"Our AI training program${clientLabel} delivers measurable impact: <strong>${sentimentPctPositive}%</strong> of participants leave feeling excited or optimistic about AI, <strong>${efficiencyPctPositive}%</strong> expect real productivity gains, and <strong>${timePctQuick}%</strong> plan to apply their learnings within a week. <strong>${noBarriersPct}%</strong> report no barriers to adoption, with a confidence score of <strong>${data.avgConfidence}/5</strong> and an NPS of <strong>${data.nps}</strong> (${npsLabel}). Employees walk away ready to put AI to work responsibly."</p>
    </div>
  `;
}

let currentClientName = '';

// Extract dominant color from logo and apply a subtle brand accent (Google-like: light, clean)
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

    // Light hero with subtle brand tint — Google style
    root.style.setProperty('--dash-hero-bg', `rgba(${r},${g},${b},0.04)`);
    root.style.setProperty('--dash-hero-text', '#202124');
    root.style.setProperty('--dash-hero-sub', '#5f6368');

    // Use brand color as the accent
    root.style.setProperty('--accent', `rgb(${r},${g},${b})`);
    root.style.setProperty('--accent-hover', `rgb(${Math.max(0,r-20)},${Math.max(0,g-20)},${Math.max(0,b-20)})`);
    root.style.setProperty('--accent-subtle', `rgba(${r},${g},${b},0.08)`);
    root.style.setProperty('--accent-border', `rgba(${r},${g},${b},0.2)`);
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
    const noBarrierCount = data.barrierCounts ? (data.barrierCounts['No Barriers'] || 0) : 0;
    const adoptionReadyPct = data.total ? Math.round((noBarrierCount / data.total) * 100) : 0;
    document.getElementById('kpiAdoptionReady').textContent = data.total ? adoptionReadyPct + '%' : '-';
    document.getElementById('kpiReadiness').textContent = data.avgOrgReadiness || '-';
    document.getElementById('kpiTotal').textContent = data.total || 0;

    if (!data.total) return;

    destroyCharts();

    // Sentiment chart
    const sentimentLabels = Object.keys(data.sentimentCounts);
    const sentimentData = Object.values(data.sentimentCounts);
    const sentimentColors = sentimentLabels.map(l => COLORS.sentiment[l] || '#4285f4');
    createBarChart('sentimentChart', sentimentLabels, sentimentData, sentimentColors);

    // Attitude change chart
    const perceptionOrder = ['Much More Positive', 'Somewhat More Positive', 'No Change', 'Somewhat More Negative', 'Much More Negative'];
    const perceptionLabels = perceptionOrder.filter(k => data.perceptionCounts[k]);
    const perceptionData = perceptionLabels.map(k => data.perceptionCounts[k]);
    createDoughnutChart('perceptionChart', perceptionLabels, perceptionData, COLORS.perception);

    // Risk perception chart
    const riskOrder = ['Much Less Concerned', 'Better Understanding', 'Unchanged', 'Slightly More Concerned', 'Much More Concerned'];
    const riskLabels = riskOrder.filter(k => data.riskCounts && data.riskCounts[k]);
    const riskData = riskLabels.map(k => data.riskCounts[k]);
    createDoughnutChart('riskChart', riskLabels, riskData, COLORS.risk);

    // Barrier chart
    if (data.barrierCounts) {
      const barrierLabels = Object.keys(data.barrierCounts);
      const barrierData = Object.values(data.barrierCounts);
      const barrierColors = barrierLabels.map(l => COLORS.barrier[l] || '#4285f4');
      createBarChart('barrierChart', barrierLabels, barrierData, barrierColors);
    }

    // Efficiency chart
    const efficiencyOrder = ['Major Improvement', 'Significant Improvement', 'Moderate Improvement', 'Slight Improvement', 'No Improvement'];
    const efficiencyLabels = efficiencyOrder.filter(k => data.efficiencyCounts[k]);
    const efficiencyData = efficiencyLabels.map(k => data.efficiencyCounts[k]);
    createDoughnutChart('efficiencyChart', efficiencyLabels, efficiencyData, COLORS.efficiency);

    // Time to application chart
    const timeOrder = ['Already Have', 'Within a Week', 'Within a Month', 'Within 3 Months', 'Not Sure'];
    const timeLabels = timeOrder.filter(k => data.timeCounts && data.timeCounts[k]);
    const timeData = timeLabels.map(k => data.timeCounts[k]);
    createBarChart('timeChart', timeLabels, timeData, timeLabels.map(l => COLORS.time[l] || '#4285f4'));

    // Most valuable chart
    const valuableLabels = Object.keys(data.valuableCounts);
    const valuableData = Object.values(data.valuableCounts);
    createHorizontalBarChart('valuableChart', valuableLabels, valuableData);

    // NPS chart
    if (data.npsBreakdown) {
      createDoughnutChart('npsChart',
        ['Promoters (9-10)', 'Passives (7-8)', 'Detractors (1-6)'],
        [data.npsBreakdown.promoters, data.npsBreakdown.passives, data.npsBreakdown.detractors],
        { 'Promoters (9-10)': '#34a853', 'Passives (7-8)': '#fbbc04', 'Detractors (1-6)': '#ea4335' }
      );
    }

    // Key takeaways
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
