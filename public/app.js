// public/app.js - Dashboard frontend

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const charts = {};
const palette = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#64748b', '#ec4899', '#06b6d4'];

const monthInput = document.getElementById('month');
const refreshBtn = document.getElementById('refreshBtn');
const now = new Date();
monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

monthInput.addEventListener('change', loadDashboard);
refreshBtn.addEventListener('click', loadDashboard);

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function showError(message) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = message;
  banner.classList.toggle('hidden', !message);
}

function setLoading(isLoading) {
  refreshBtn.disabled = isLoading;
  refreshBtn.textContent = isLoading ? 'Memuat...' : 'Refresh';
  document.body.classList.toggle('loading', isLoading);
}

function renderChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, config);
}

function emptyChart(id, label = 'Belum ada data') {
  renderChart(id, {
    type: 'doughnut',
    data: { labels: [label], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }] },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });
}

async function loadDashboard() {
  const month = monthInput.value;
  setLoading(true);
  showError('');

  try {
    const res = await fetch(`/api/dashboard?month=${encodeURIComponent(month)}`);
    if (!res.ok) throw new Error(`API dashboard gagal (${res.status})`);
    const data = await res.json();

    renderSummary(data.summary);
    renderInsights(data.insights, data.summary);
    renderCharts(data.charts);
    renderTransactions(data.recentTransactions || []);
    renderReceiptItems(data.receiptItems || []);
    setText('lastUpdated', `Update: ${new Date(data.generatedAt || Date.now()).toLocaleString('id-ID')}`);
  } catch (err) {
    console.error('Error loadDashboard:', err);
    showError(`Gagal memuat dashboard: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

function renderSummary(summary = {}) {
  setText('income', fmt(summary.income));
  setText('expense', fmt(summary.expense));
  setText('balance', fmt(summary.balance));
  setText('budget', fmt(summary.budgetRemaining));
  setText('totalTransactions', Number(summary.totalTransactions || 0).toLocaleString('id-ID'));
  setText('dailyAverage', fmt(summary.averageExpensePerDay));
  setText('budgetPercent', `${summary.budgetUsedPercent || 0}% budget terpakai`);
}

function renderInsights(insights = {}, summary = {}) {
  const pct = Number(summary.budgetUsedPercent || 0);
  const progress = document.getElementById('budgetProgress');
  progress.style.width = `${Math.min(pct, 100)}%`;
  progress.classList.toggle('danger', pct >= 100);
  setText('budgetStatus', pct >= 100 ? 'Melebihi budget' : `${pct}% terpakai`);

  setText('biggestCategory', insights.biggestCategory?.label || '-');
  setText('biggestCategoryValue', fmt(insights.biggestCategory?.value));
  setText('biggestStore', insights.biggestStore?.label || '-');
  setText('biggestStoreValue', fmt(insights.biggestStore?.value));
  setText('biggestItem', insights.biggestItem?.label || '-');
  setText('biggestItemValue', fmt(insights.biggestItem?.value));
}

function renderCharts(chartsData = {}) {
  renderCategoryChart(chartsData.byCategory || {});
  renderTrendChart(chartsData.monthlyTrend || {});
  renderDailyExpenseChart(chartsData.dailyExpense || {});
  renderTopCategoryChart(chartsData.topCategories || []);
  renderStoreChart(chartsData.topStores || []);
  renderPaymentMethodChart(chartsData.paymentMethods || {});
  renderTopItemsChart(chartsData.topItems || []);
}

function renderCategoryChart(byCategory) {
  const labels = Object.keys(byCategory);
  const values = Object.values(byCategory);
  if (!labels.length) return emptyChart('categoryChart');

  renderChart('categoryChart', {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: palette }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: tooltipCurrency() } },
  });
}

function renderTrendChart(data) {
  if (!data.months?.length) return emptyChart('trendChart');

  renderChart('trendChart', {
    type: 'bar',
    data: {
      labels: data.months,
      datasets: [
        { label: 'Pemasukan', data: data.income || [], backgroundColor: '#22c55e' },
        { label: 'Pengeluaran', data: data.expense || [], backgroundColor: '#ef4444' },
        { label: 'Saldo', data: data.balance || [], type: 'line', borderColor: '#2563eb', backgroundColor: '#2563eb', tension: 0.35 },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: tooltipCurrency() }, scales: { y: { beginAtZero: true } } },
  });
}

function renderDailyExpenseChart(data) {
  if (!data.dates?.length) return emptyChart('dailyExpenseChart');

  renderChart('dailyExpenseChart', {
    type: 'line',
    data: { labels: data.dates, datasets: [{ label: 'Pengeluaran Harian', data: data.values || [], borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,.14)', fill: true, tension: 0.35 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: tooltipCurrency() }, scales: { y: { beginAtZero: true } } },
  });
}

function renderHorizontalBar(id, rows, label) {
  if (!rows.length) return emptyChart(id);
  renderChart(id, {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets: [{ label, data: rows.map(r => r.value), backgroundColor: palette }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, tooltip: tooltipCurrency() }, scales: { x: { beginAtZero: true } } },
  });
}

function renderTopCategoryChart(rows) { renderHorizontalBar('topCategoryChart', rows, 'Kategori'); }
function renderStoreChart(rows) { renderHorizontalBar('storeChart', rows, 'Toko'); }
function renderTopItemsChart(rows) { renderHorizontalBar('topItemsChart', rows, 'Item'); }

function renderPaymentMethodChart(methods) {
  const labels = Object.keys(methods);
  const values = Object.values(methods);
  if (!labels.length) return emptyChart('paymentMethodChart');

  renderChart('paymentMethodChart', {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: palette }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: tooltipCurrency() } },
  });
}

function tooltipCurrency() {
  return { callbacks: { label: (ctx) => `${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${fmt(ctx.parsed?.y ?? ctx.parsed?.x ?? ctx.parsed)}` } };
}

function renderTransactions(txs) {
  setText('txCount', `${txs.length} transaksi`);
  const tbody = document.querySelector('#txTable tbody');
  tbody.innerHTML = '';

  if (!txs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi bulan ini</td></tr>';
    return;
  }

  txs.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(t.date || '-')}</td>
      <td><span class="tag ${escapeHtml(t.type || '')}">${escapeHtml(t.type || '-')}</span></td>
      <td>${escapeHtml(t.category || '-')}</td>
      <td class="amount ${t.type === 'pemasukan' ? 'positive' : 'negative'}">${fmt(t.amount)}</td>
      <td>${escapeHtml(t.note || '-')}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReceiptItems(items) {
  setText('itemCount', `${items.length} item`);
  const tbody = document.querySelector('#itemTable tbody');
  tbody.innerHTML = '';

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada detail item struk</td></tr>';
    return;
  }

  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.date || '-')}</td>
      <td>${escapeHtml(item.store_name || '-')}</td>
      <td>${escapeHtml(item.description || '-')}</td>
      <td>${escapeHtml(item.quantity || 1)}</td>
      <td class="amount negative">${fmt(item.total_price)}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadDashboard();
