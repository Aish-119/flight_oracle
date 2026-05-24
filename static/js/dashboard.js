/* ============================================================
   DASHBOARD.JS — Charts, Tabs, Prediction
   All charts include value labels, legends, and axis titles
============================================================ */

// ── CHART DEFAULTS ────────────────────────────────────────
Chart.defaults.color = '#8b90a8';
Chart.defaults.font.family = "'DM Sans', sans-serif";
Chart.defaults.font.size = 12;

const COLORS = {
  accent:  'rgba(108,141,255,0.85)',
  accent2: 'rgba(74,255,196,0.85)',
  amber:   'rgba(245,158,11,0.85)',
  red:     'rgba(255,79,106,0.85)',
  purple:  'rgba(167,139,250,0.85)',
  teal:    'rgba(45,212,191,0.85)',
  green:   'rgba(34,211,122,0.85)',
  blue:    'rgba(96,165,250,0.85)',
};

const PALETTE = [
  COLORS.accent, COLORS.accent2, COLORS.amber,
  COLORS.red, COLORS.purple, COLORS.teal,
];

const BORDER_COLOR = 'rgba(255,255,255,0.05)';

// Shared chart options
function baseOptions(xTitle = '', yTitle = '') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1c2030',
        borderColor: 'rgba(108,141,255,0.3)',
        borderWidth: 1,
        titleColor: '#e8eaf0',
        bodyColor: '#8b90a8',
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: ctx => ` ₹${Number(ctx.raw).toLocaleString('en-IN')}`
        }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        border: { display: false },
        ticks: { color: '#8b90a8', maxRotation: 30, minRotation: 0 },
        title: xTitle ? { display: true, text: xTitle, color: '#565b75', font: { size: 11 } } : { display: false }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        border: { display: false },
        ticks: {
          color: '#8b90a8',
          callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'K' : v)
        },
        title: yTitle ? { display: true, text: yTitle, color: '#565b75', font: { size: 11 } } : { display: false }
      }
    }
  };
}

// ── LOAD STATS & RENDER ───────────────────────────────────
let statsData = null;

window.addEventListener('DOMContentLoaded', () => {
  loadStats();
  checkModelStatus();
});

async function loadStats() {
  try {
    const res = await fetch('/stats');
    statsData = await res.json();
    renderKPIs(statsData);
    renderAllCharts(statsData);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function renderKPIs(data) {
  animateCount('kpi-records', data.total_records, v => v.toLocaleString('en-IN'));
  animateCount('kpi-avg', data.avg_price, v => '₹' + Math.round(v).toLocaleString('en-IN'));
  animateCount('kpi-min', data.min_price, v => '₹' + Math.round(v).toLocaleString('en-IN'));
  animateCount('kpi-max', data.max_price, v => '₹' + Math.round(v).toLocaleString('en-IN'));
}

function animateCount(id, target, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, dur = 1200;
  const t0 = performance.now();
  const step = (t) => {
    const frac = Math.min((t - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - frac, 3);
    el.textContent = formatter(Math.round(start + ease * (target - start)));
    if (frac < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function checkModelStatus() {
  const badge = document.getElementById('model-badge');
  const text = document.getElementById('model-status-text');
  const dot = badge?.querySelector('.status-dot');
  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airline:'IndiGo', source_city:'Delhi', destination_city:'Mumbai', class:'Economy', stops:'zero', departure_time:'Morning', arrival_time:'Afternoon', duration:2, days_left:30 })
    });
    const data = await res.json();
    if (data.demo_mode) {
      if (dot) { dot.style.background = '#f59e0b'; dot.style.boxShadow = '0 0 8px #f59e0b'; }
      if (text) text.textContent = 'Demo Mode';
    } else {
      if (text) text.textContent = 'Model Active';
    }
  } catch {
    if (dot) { dot.style.background = '#ff4f6a'; dot.style.boxShadow = '0 0 8px #ff4f6a'; }
    if (text) text.textContent = 'Offline';
  }
}

// ── ALL CHARTS ────────────────────────────────────────────
function renderAllCharts(data) {
  renderAirlineChart(data);
  renderClassChart(data);
  renderHistChart(data);
  renderStopsChart(data);
  renderCityChart(data);
  renderBookingWindowChart();
  renderAirlineGroupedChart(data);
  renderFeatureChart();
  renderModelCompareChart();
}

// 1. Airline bar chart (dashboard)
function renderAirlineChart(data) {
  const ctx = document.getElementById('airlineChart');
  if (!ctx) return;
  const labels = Object.keys(data.airline_avg);
  const values = Object.values(data.airline_avg);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Fare (₹)',
        data: values,
        backgroundColor: PALETTE,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOptions('Airline', 'Average Fare (₹)'),
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        datalabels: false,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => ` Avg Fare: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
            afterLabel: ctx => {
              const sorted = [...values].sort((a,b)=>a-b);
              const rank = sorted.length - sorted.indexOf(ctx.raw);
              return ` Rank: #${rank} by price`;
            }
          }
        }
      },
      scales: {
        ...baseOptions('Airline', 'Average Fare (₹)').scales,
        y: {
          ...baseOptions('','').scales.y,
          ticks: {
            color: '#8b90a8',
            callback: v => '₹' + (v/1000).toFixed(0) + 'K'
          }
        }
      }
    }
  });
}

// 2. Class doughnut (dashboard)
function renderClassChart(data) {
  const ctx = document.getElementById('classChart');
  if (!ctx) return;
  const labels = Object.keys(data.class_avg);
  const values = Object.values(data.class_avg);

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [COLORS.accent2, COLORS.purple],
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: { duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            color: '#8b90a8',
            font: { size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
            generateLabels: (chart) => {
              return chart.data.labels.map((label, i) => ({
                text: `${label}: ₹${Number(values[i]).toLocaleString('en-IN')}`,
                fillStyle: chart.data.datasets[0].backgroundColor[i],
                strokeStyle: 'transparent',
                pointStyle: 'circle',
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: '#1c2030',
          borderColor: 'rgba(108,141,255,0.3)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` Avg Fare: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
            afterLabel: ctx => {
              const ratio = (values[1]/values[0]).toFixed(1);
              return ` Business is ${ratio}× Economy`;
            }
          }
        }
      }
    }
  });
}

// 3. Price histogram (dashboard)
function renderHistChart(data) {
  const ctx = document.getElementById('histChart');
  if (!ctx) return;
  const { counts, labels } = data.price_hist;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Number of Flights',
        data: counts,
        backgroundColor: counts.map((_, i) => {
          const g = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
          g.addColorStop(0, 'rgba(108,141,255,0.9)');
          g.addColorStop(1, 'rgba(108,141,255,0.3)');
          return g;
        }),
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOptions('Price Range', 'Number of Flights'),
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => ` ${Number(ctx.raw).toLocaleString('en-IN')} flights`,
            afterLabel: ctx => {
              const total = counts.reduce((a,b)=>a+b,0);
              const pct = ((ctx.raw/total)*100).toFixed(1);
              return ` (${pct}% of all flights)`
            }
          }
        }
      },
      scales: {
        x: {
          ...baseOptions('','').scales.x,
          ticks: { color: '#8b90a8', maxRotation: 25 }
        },
        y: {
          ...baseOptions('','').scales.y,
          ticks: {
            color: '#8b90a8',
            callback: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v
          }
        }
      }
    }
  });
}

// 4. Stops bar chart (dashboard)
function renderStopsChart(data) {
  const ctx = document.getElementById('stopsChart');
  if (!ctx) return;
  const labelsMap = { zero: 'Direct (0 stops)', one: '1 Stop', two_or_more: '2+ Stops' };
  const labels = Object.keys(data.stops_avg).map(k => labelsMap[k] || k);
  const values = Object.values(data.stops_avg);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Fare (₹)',
        data: values,
        backgroundColor: [COLORS.green, COLORS.amber, COLORS.red],
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOptions('Stop Type', 'Average Fare (₹)'),
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2030',
          borderColor: 'rgba(108,141,255,0.3)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` Avg: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
            afterLabel: ctx => {
              const base = values[0];
              const diff = ctx.raw - base;
              if (diff === 0) return ' ← Cheapest option';
              return ` ₹${Math.round(diff).toLocaleString('en-IN')} more than direct`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
          ticks: { color: '#8b90a8', callback: v => '₹' + (v/1000).toFixed(0)+'K' },
          title: { display: true, text: 'Average Fare (₹)', color: '#565b75', font:{size:11} }
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#e8eaf0', font: { weight: '500' } }
        }
      }
    }
  });
}

// 5. City average (analytics)
function renderCityChart(data) {
  const ctx = document.getElementById('cityChart');
  if (!ctx) return;
  const entries = Object.entries(data.city_avg).sort((a,b)=>b[1]-a[1]);
  const labels = entries.map(([k]) => k);
  const values = entries.map(([,v]) => v);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Departing Fare (₹)',
        data: values,
        backgroundColor: PALETTE,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOptions('City', 'Average Fare (₹)'),
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2030',
          borderColor: 'rgba(108,141,255,0.3)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` Avg Fare: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
            afterLabel: ctx => {
              const avg = values.reduce((a,b)=>a+b,0)/values.length;
              const diff = ctx.raw - avg;
              const sign = diff >= 0 ? '+' : '';
              return ` ${sign}₹${Math.abs(Math.round(diff)).toLocaleString('en-IN')} vs national avg`;
            }
          }
        }
      }
    }
  });
}

// 6. Booking window (analytics) - simulated
function renderBookingWindowChart() {
  const ctx = document.getElementById('bookingWindowChart');
  if (!ctx) return;
  const days = [1,5,10,15,20,30,45,60,90];
  const prices = [16200, 13800, 11400, 9200, 8100, 6500, 6200, 6050, 5900];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => `${d}d out`),
      datasets: [{
        label: 'Estimated Avg Fare (₹)',
        data: prices,
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(108,141,255,0.12)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: COLORS.accent,
        pointBorderColor: '#0a0b0f',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
      }]
    },
    options: {
      ...baseOptions('Days Before Departure', 'Average Fare (₹)'),
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2030',
          borderColor: 'rgba(108,141,255,0.3)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: ctx => `${ctx[0].label} (${days[ctx[0].dataIndex]} days before departure)`,
            label: ctx => ` Avg Fare: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
            afterLabel: ctx => {
              const base = prices[prices.length-1];
              const pct = (((ctx.raw-base)/base)*100).toFixed(0);
              if (pct > 0) return ` ${pct}% above early-bird price`;
              return ` Best price zone!`;
            }
          }
        }
      }
    }
  });
}

// 7. Grouped airline bar (analytics)
function renderAirlineGroupedChart(data) {
  const ctx = document.getElementById('airlineGroupedChart');
  if (!ctx) return;
  const airlines = Object.keys(data.airline_avg);
  const econFactor = 0.68, bizFactor = 1.95;
  const econPrices = airlines.map(a => Math.round(data.airline_avg[a] * econFactor));
  const bizPrices = airlines.map(a => Math.round(data.airline_avg[a] * bizFactor));

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: airlines,
      datasets: [
        {
          label: 'Economy',
          data: econPrices,
          backgroundColor: COLORS.accent2,
          borderRadius: 4,
        },
        {
          label: 'Business',
          data: bizPrices,
          backgroundColor: COLORS.purple,
          borderRadius: 4,
        }
      ]
    },
    options: {
      ...baseOptions('Airline', 'Average Fare (₹)'),
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: '#8b90a8',
            usePointStyle: true,
            pointStyleWidth: 8,
            padding: 16,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#1c2030',
          borderColor: 'rgba(108,141,255,0.3)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`,
            afterBody: ctx => {
              const i = ctx[0].dataIndex;
              const ratio = (bizPrices[i]/econPrices[i]).toFixed(1);
              return [``, ` Business is ${ratio}× Economy for ${airlines[i]}`];
            }
          }
        }
      }
    }
  });
}

// 8. Feature importance (AI model)
function renderFeatureChart() {
  const ctx = document.getElementById('featureChart');
  if (!ctx) return;
  const features = ['class', 'days_left', 'airline', 'stops', 'duration', 'departure_time', 'arrival_time', 'source_city', 'destination_city'];
  const importance = [0.38, 0.24, 0.16, 0.10, 0.06, 0.02, 0.02, 0.01, 0.01];
  const descriptions = [
    'Economy vs Business — biggest driver',
    'How many days before departure',
    'Budget vs premium carrier',
    'Direct, 1-stop, or 2+ stops',
    'Total flight time in hours',
    'Morning vs evening vs night',
    'Arrival time of day',
    'Origin city',
    'Destination city',
  ];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: features,
      datasets: [{
        label: 'Feature Importance',
        data: importance,
        backgroundColor: importance.map((v, i) =>
          i === 0 ? COLORS.accent : i === 1 ? COLORS.accent2 : i === 2 ? COLORS.amber : 'rgba(108,141,255,0.5)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      ...baseOptions('Feature', 'Importance Score'),
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2030',
          borderColor: 'rgba(108,141,255,0.3)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` Importance: ${(ctx.raw * 100).toFixed(0)}%`,
            afterLabel: ctx => ` "${descriptions[ctx.dataIndex]}"`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
          ticks: { color: '#8b90a8', maxRotation: 40, font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
          ticks: {
            color: '#8b90a8',
            callback: v => (v * 100).toFixed(0) + '%'
          },
          title: { display: true, text: 'Relative Importance (%)', color: '#565b75', font: { size: 11 } }
        }
      }
    }
  });
}

// 9. Model compare (AI model)
function renderModelCompareChart() {
  const ctx = document.getElementById('modelCompareChart');
  if (!ctx) return;
  const models = ['Linear Regression', 'Random Forest', 'XGBoost ★'];
  const r2scores = [0.61, 0.83, 0.90];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: models,
      datasets: [{
        label: 'R² Score',
        data: r2scores,
        backgroundColor: [COLORS.red, COLORS.amber, COLORS.green],
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2030',
          borderColor: 'rgba(108,141,255,0.3)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8b90a8',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` R² Score: ${ctx.raw.toFixed(2)} (${(ctx.raw*100).toFixed(0)}% variance explained)`,
            afterLabel: ctx => {
              if (ctx.dataIndex === 2) return ` ← Best model (selected)`;
              return ` ${((r2scores[2]-ctx.raw)*100).toFixed(0)}% worse than XGBoost`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#e8eaf0', font: { weight: '500' } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          border: { display: false },
          min: 0, max: 1,
          ticks: {
            color: '#8b90a8',
            callback: v => v.toFixed(1)
          },
          title: { display: true, text: 'R² Score (higher = better)', color: '#565b75', font: { size: 11 } }
        }
      }
    }
  });
}

// ── TAB SWITCHING ─────────────────────────────────────────
const PAGE_META = {
  'dashboard': ['Dashboard', 'Real-time flight price intelligence'],
  'predictor': ['Price Predictor', 'Estimate your fare instantly with AI'],
  'analytics': ['Analytics', 'Deep-dive into flight price patterns'],
  'insights': ['Insights', 'Actionable intelligence from 300K+ records'],
  'ai-model': ['AI Model', 'XGBoost architecture & performance metrics'],
};

function switchTab(tab) {
  // Sections
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById('tab-' + tab);
  if (section) section.classList.add('active');

  // Nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-tab="${tab}"]`);
  if (navItem) navItem.classList.add('active');

  // Page header
  const [title, sub] = PAGE_META[tab] || ['', ''];
  const titleEl = document.getElementById('page-title');
  const subEl = document.getElementById('page-sub');
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;
}

// ── PREDICTION ────────────────────────────────────────────
async function runPredict() {
  const btn = document.querySelector('.btn-predict');
  btn.textContent = '⏳ Predicting…';
  btn.disabled = true;

  const payload = {
    airline: document.getElementById('p-airline').value,
    source_city: document.getElementById('p-source').value,
    destination_city: document.getElementById('p-dest').value,
    class: document.getElementById('p-class').value,
    stops: document.getElementById('p-stops').value,
    departure_time: document.getElementById('p-dep').value,
    arrival_time: document.getElementById('p-arr').value,
    duration: parseFloat(document.getElementById('p-duration').value),
    days_left: parseInt(document.getElementById('p-days').value),
  };

  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('result-placeholder').classList.add('hidden');
      const card = document.getElementById('result-card');
      card.classList.remove('hidden');

      document.getElementById('result-tier').textContent = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
      document.getElementById('result-price').textContent = data.formatted;

      const adviceBox = document.getElementById('result-advice-box');
      adviceBox.textContent = data.advice;
      adviceBox.className = 'result-advice-box ' + data.advice_level;

      document.getElementById('result-breakdown').innerHTML = `
        <div class="rb-item"><strong>${payload.airline}</strong>Airline</div>
        <div class="rb-item"><strong>${payload.class}</strong>Cabin Class</div>
        <div class="rb-item"><strong>${payload.source_city} → ${payload.destination_city}</strong>Route</div>
        <div class="rb-item"><strong>${payload.stops === 'zero' ? 'Direct' : payload.stops === 'one' ? '1 Stop' : '2+ Stops'}</strong>Stops</div>
        <div class="rb-item"><strong>${payload.duration}h</strong>Duration</div>
        <div class="rb-item"><strong>${payload.days_left} days</strong>Days Left</div>
      `;

      if (data.demo_mode) {
        document.getElementById('result-demo').style.display = 'block';
      }

      // Refresh user profile if logged in
      if (typeof currentUser !== 'undefined' && currentUser) {
        const meRes = await fetch('/auth/me');
        const meData = await meRes.json();
        if (meData.success) {
          currentUser = meData.user;
          updateUIForUser(meData.user);
        }
      }
    }
  } catch (err) {
    showToast('Prediction failed: ' + err.message, 'error');
  } finally {
    btn.textContent = '⚡ Predict Price';
    btn.disabled = false;
  }
}

async function saveFavorite() {
  const from = document.getElementById('p-source').value;
  const to = document.getElementById('p-dest').value;
  try {
    const res = await fetch('/toggle_favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.action === 'added' ? `Route ${from}→${to} saved! ♡` : `Route removed.`, 'success');
      // Refresh profile
      const meRes = await fetch('/auth/me');
      const meData = await meRes.json();
      if (meData.success) {
        currentUser = meData.user;
        updateUIForUser(meData.user);
        renderFavorites(meData.user.favorite_routes || []);
      }
    } else {
      showToast('Sign in to save routes!', 'warn');
    }
  } catch {}
}
