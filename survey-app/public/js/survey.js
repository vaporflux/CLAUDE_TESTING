document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('surveyForm');
  const cards = document.querySelectorAll('.question-card');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const thankYou = document.getElementById('thankYou');
  let currentQuestion = 0;

  // Get client ID from URL
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client');

  // Load client name and logo into header
  if (clientId) {
    fetch('/api/clients/' + clientId)
      .then(r => r.json())
      .then(client => {
        if (client.name) {
          const banner = document.getElementById('clientBanner');
          if (client.logoUrl) {
            banner.innerHTML = `<img src="${client.logoUrl}" alt="${client.name}" class="banner-logo"><span>${client.name}</span>`;
          } else {
            document.getElementById('surveyClientName').textContent = client.name;
          }
          banner.style.display = 'flex';
        }
      })
      .catch(() => {});
  }

  function showQuestion(index) {
    cards.forEach((card, i) => {
      card.classList.toggle('active', i === index);
    });

    prevBtn.disabled = index === 0;
    const isLast = index === cards.length - 1;
    nextBtn.style.display = isLast ? 'none' : 'inline-block';
    submitBtn.style.display = isLast ? 'inline-block' : 'none';

    const progress = ((index + 1) / cards.length) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `Question ${index + 1} of ${cards.length}`;
  }

  // Star rating (Q1)
  document.querySelectorAll('#satisfactionRating .star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.dataset.value);
      document.getElementById('overallSatisfaction').value = value;
      document.querySelectorAll('#satisfactionRating .star-btn').forEach((b, i) => {
        b.classList.toggle('active', i < value);
      });
    });
  });

  // Confidence slider (Q3)
  const slider = document.getElementById('confidenceSlider');
  const valueDisplay = document.getElementById('confidenceValue');
  const labels = ['1 - Not Confident', '2 - Somewhat', '3 - Confident', '4 - Very Confident', '5 - Extremely Confident'];
  slider.addEventListener('input', () => {
    valueDisplay.textContent = labels[slider.value - 1];
  });

  // NPS buttons (Q6)
  document.querySelectorAll('.nps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.dataset.value);
      document.getElementById('npsScore').value = value;
      document.querySelectorAll('.nps-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.value) <= value);
        if (parseInt(b.dataset.value) <= value) {
          if (value <= 6) b.classList.add('detractor');
          else if (value <= 8) b.classList.add('passive');
          else b.classList.add('promoter');
        } else {
          b.classList.remove('detractor', 'passive', 'promoter');
        }
      });
    });
  });

  // Emoji options (Q2)
  document.querySelectorAll('.emoji-option input').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.emoji-card').forEach(c => c.classList.remove('selected'));
      input.closest('.emoji-option').querySelector('.emoji-card').classList.add('selected');
    });
  });

  // Navigation
  nextBtn.addEventListener('click', () => {
    if (currentQuestion < cards.length - 1) {
      currentQuestion++;
      showQuestion(currentQuestion);
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentQuestion > 0) {
      currentQuestion--;
      showQuestion(currentQuestion);
    }
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      overallSatisfaction: parseInt(formData.get('overallSatisfaction')) || null,
      aiSentiment: formData.get('aiSentiment') || null,
      confidenceLevel: parseInt(formData.get('confidenceLevel')) || null,
      efficiencyBelief: formData.get('efficiencyBelief') || null,
      mostValuable: formData.get('mostValuable') || null,
      npsScore: parseInt(formData.get('npsScore')) || null,
      perceptionChange: formData.get('perceptionChange') || null,
      toolsExcited: formData.getAll('toolsExcited'),
      concerns: formData.getAll('concerns'),
      additionalComments: formData.get('additionalComments') || ''
    };

    // Determine API endpoint based on whether we have a client
    const endpoint = clientId
      ? `/api/clients/${clientId}/responses`
      : '/api/responses';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        form.style.display = 'none';
        document.querySelector('.nav-buttons').style.display = 'none';
        document.querySelector('.progress-bar').style.display = 'none';
        document.querySelector('.progress-text').style.display = 'none';
        thankYou.style.display = 'block';
      } else {
        alert('There was an error submitting your response. Please try again.');
      }
    } catch {
      alert('Could not connect to the server. Please check your connection and try again.');
    }
  });

  showQuestion(0);
});
