// src/services/dashboard.js
// Web dashboard untuk menampilkan ringkasan & grafik keuangan
// Menggunakan Express + Chart.js (dari CDN)

const express = require('express');
const path = require('path');
const dayjs = require('dayjs');
const { getTransactions } = require('./googleSheets');

function initDashboard(port) {
  const app = express();

  // Sajikan file statis (HTML/CSS/JS)
  app.use(express.static(path.join(__dirname, '../../public')));

  // API: ambil semua transaksi (opsional filter ?month=YYYY-MM)
  app.get('/api/transactions', async (req, res) => {
    try {
      const month = req.query.month;
      const txs = await getTransactions(month ? { month } : {});
      res.json(txs);
    } catch (err) {
      console.error('❌ Error /api/transactions:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // API: ringkasan keuangan (per bulan + per kategori)
  app.get('/api/summary', async (req, res) => {
    try {
      const month = req.query.month || dayjs().format('YYYY-MM');
      const txs = await getTransactions({ month });

      let income = 0, expense = 0;
      const byCategory = {};

      txs.forEach(t => {
        if (t.type === 'pemasukan') income += t.amount;
        else {
          expense += t.amount;
          byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
        }
      });

      const budget = Number(process.env.MONTHLY_BUDGET || 0);

      res.json({
        month,
        income,
        expense,
        balance: income - expense,
        budget,
        budgetRemaining: budget - expense,
        totalTransactions: txs.length,
        byCategory,
      });
    } catch (err) {
      console.error('❌ Error /api/summary:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // API: tren bulanan (income vs expense per bulan)
  app.get('/api/trend', async (req, res) => {
    try {
      const txs = await getTransactions({});
      const byMonth = {};

      txs.forEach(t => {
        if (!byMonth[t.month]) byMonth[t.month] = { income: 0, expense: 0 };
        if (t.type === 'pemasukan') byMonth[t.month].income += t.amount;
        else byMonth[t.month].expense += t.amount;
      });

      const months = Object.keys(byMonth).sort();
      res.json({
        months,
        income: months.map(m => byMonth[m].income),
        expense: months.map(m => byMonth[m].expense),
      });
    } catch (err) {
      console.error('❌ Error /api/trend:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => {
    console.log(`✅ Dashboard berjalan di http://localhost:${port}`);
  });

  return app;
}

module.exports = { initDashboard };
