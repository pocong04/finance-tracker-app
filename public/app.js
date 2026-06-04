// public/app.js - Logika frontend dashboard

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

let categoryChart = null;
let trendChart = null;

// Set bulan default ke bulan ini
const monthInput = document.getElementById('month');
const now = new Date();
monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

monthInput.addEventListener('change', loadAll);

async function loadAll() {
  const month = monthInput.value;
  await Promise.all([
    loadSummary(month),
    loadTransactions(month),
    loadTrend(),
  ]);
}

async function loadSummary(month) {
  try {
    const res = await fetch(`/api/summary?month=${month}`);
    const data = await res.json();

    document.getElementById('income').textContent = fmt(data.income);
    document.getElementById('expense').textContent = fmt(data.expense);
    document.getElementById('balance').textContent = fmt(data.balance);
    document.getElementById('budget').textContent = fmt(data.budgetRemaining);

    renderCategoryChart(data.byCategory);
  } catch (err) {
    console.error('Error loadSummary:', err);
  }
}

async function loadTransactions(month) {
  try {
    const res = await fetch(`/api/transactions?month=${month}`);
    const txs = await res.json();

    const tbody = document.querySelector('#txTable tbody');
    tbody.innerHTML = '';

    // Tampilkan transaksi terbaru di atas
    txs.reverse().forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.date}</td>
        <td><span class="tag ${t.type}">${t.type}</span></td>
        <td>${t.category}</td>
        <td>${fmt(t.amount)}</td>
        <td>${t.note}</td>
      `;
      tbody.appendChild(tr);
    });

    if (txs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">Belum ada transaksi bulan ini</td></tr>';
    }
  } catch (err) {
    console.error('Error loadTransactions:', err);
  }
}

async function loadTrend() {
  try {
    const res = await fetch('/api/trend');
    const data = await res.json();
    renderTrendChart(data);
  } catch (err) {
    console.error('Error loadTrend:', err);
  }
}

function renderCategoryChart(byCategory) {
  const labels = Object.keys(byCategory);
  const values = Object.values(byCategory);

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
          '#3498db', '#9b59b6', '#34495e', '#95a5a6', '#d35400'
        ],
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

function renderTrendChart(data) {
  if (trendChart) trendChart.destroy();

  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'bar',
    data: {
      labels: data.months,
      datasets: [
        { label: 'Pemasukan', data: data.income, backgroundColor: '#2ecc71' },
        { label: 'Pengeluaran', data: data.expense, backgroundColor: '#e74c3c' },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// Muat data saat halaman pertama kali dibuka
loadAll();
