// src/services/dashboard.js
// Web dashboard untuk menampilkan ringkasan, grafik, dan insight keuangan

const express = require('express');
const path = require('path');
const dayjs = require('dayjs');
const { getTransactions, getReceiptItems } = require('./googleSheets');

// ====== NEW: Dashboard token auth ======
function parseDashboardTokens() {
  const tokenStr = process.env.DASHBOARD_ACCESS_TOKENS || '';
  const tokenMap = {};
  tokenStr.split(',').forEach(pair => {
    const [userId, token] = pair.trim().split(':');
    if (userId && token) tokenMap[token] = userId;
  });
  return tokenMap;
}

function getDashboardUserId(req) {
  const token = req.query.token || req.headers['x-dashboard-token'];
  if (!token) return null;
  const tokenMap = parseDashboardTokens();
  return tokenMap[token] || null;
}

function requireDashboardUser(req, res, next) {
  const userId = getDashboardUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid dashboard token' });
  }
  req.userId = userId;
  next();
}

function toAmount(value) {
  return Number(value) || 0;
}

function groupSum(items, keyFn, amountFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || 'Lainnya';
    acc[key] = (acc[key] || 0) + toAmount(amountFn(item));
    return acc;
  }, {});
}

function sortObjectDesc(obj) {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]));
}

function topEntries(obj, limit = 8) {
  return Object.entries(sortObjectDesc(obj)).slice(0, limit).map(([label, value]) => ({ label, value }));
}

function buildMonthlyTrend(allTxs) {
  const byMonth = {};
  allTxs.forEach(t => {
    const month = t.month || (t.date ? String(t.date).slice(0, 7) : 'Unknown');
    if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0, balance: 0 };
    const amount = toAmount(t.amount);
    if (t.type === 'pemasukan') byMonth[month].income += amount;
    else byMonth[month].expense += amount;
    byMonth[month].balance = byMonth[month].income - byMonth[month].expense;
  });

  const months = Object.keys(byMonth).sort();
  return {
    months,
    income: months.map(m => byMonth[m].income),
    expense: months.map(m => byMonth[m].expense),
    balance: months.map(m => byMonth[m].balance),
  };
}

function buildDailyExpense(monthlyTxs) {
  const byDate = groupSum(
    monthlyTxs.filter(t => t.type !== 'pemasukan'),
    t => t.date || (t.timestamp ? String(t.timestamp).split(' ')[0] : 'Unknown'),
    t => t.amount
  );
  const dates = Object.keys(byDate).sort();
  return { dates, values: dates.map(d => byDate[d]) };
}

function buildReceiptInsights(receiptItems) {
  const topStores = topEntries(groupSum(receiptItems, i => i.store_name || 'Tidak diketahui', i => i.total_price), 8);
  const paymentMethods = sortObjectDesc(groupSum(receiptItems, i => i.payment_method || 'Tidak diketahui', i => i.total_price));
  const topItems = topEntries(groupSum(receiptItems, i => i.description || 'Item', i => i.total_price), 10);
  const newestItems = [...receiptItems]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 12);

  return { topStores, paymentMethods, topItems, newestItems };
}

function buildDashboardPayload(month, monthlyTxs, allTxs, receiptItems) {
  const income = monthlyTxs.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + toAmount(t.amount), 0);
  const expenseTxs = monthlyTxs.filter(t => t.type !== 'pemasukan');
  const expense = expenseTxs.reduce((sum, t) => sum + toAmount(t.amount), 0);
  const budget = Number(process.env.MONTHLY_BUDGET || 0);
  const byCategory = sortObjectDesc(groupSum(expenseTxs, t => t.category || 'Lainnya', t => t.amount));
  const dailyExpense = buildDailyExpense(monthlyTxs);
  const receiptInsights = buildReceiptInsights(receiptItems);
  const topCategories = topEntries(byCategory, 8);
  const daysInMonth = month ? dayjs(month + '-01').daysInMonth() : dayjs().daysInMonth();
  const averageExpensePerDay = daysInMonth ? Math.round(expense / daysInMonth) : 0;
  const budgetUsedPercent = budget > 0 ? Math.min(999, Math.round((expense / budget) * 100)) : 0;

  const recentTransactions = [...monthlyTxs]
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, 20);

  return {
    month,
    generatedAt: new Date().toISOString(),
    summary: {
      income,
      expense,
      balance: income - expense,
      budget,
      budgetRemaining: budget - expense,
      totalTransactions: monthlyTxs.length,
      receiptItemCount: receiptItems.length,
      averageExpensePerDay,
      budgetUsedPercent,
    },
    charts: {
      byCategory,
      monthlyTrend: buildMonthlyTrend(allTxs),
      dailyExpense,
      topCategories,
      topStores: receiptInsights.topStores,
      paymentMethods: receiptInsights.paymentMethods,
      topItems: receiptInsights.topItems,
    },
    insights: {
      biggestCategory: topCategories[0] || null,
      biggestStore: receiptInsights.topStores[0] || null,
      biggestItem: receiptInsights.topItems[0] || null,
      budgetUsedPercent,
    },
    recentTransactions,
    receiptItems: receiptInsights.newestItems,
  };
}

function initDashboard(port) {
  const app = express();

  app.use(express.static(path.join(__dirname, '../../public')));

  app.get('/api/dashboard', requireDashboardUser, async (req, res) => {
    try {
      const month = req.query.month || dayjs().format('YYYY-MM');
      const [monthlyTxs, allTxs] = await Promise.all([
        getTransactions({ month, userId: req.userId }),
        getTransactions({ userId: req.userId }),
      ]);

      let receiptItems = [];
      try {
        receiptItems = await getReceiptItems({ month, userId: req.userId });
      } catch (itemErr) {
        console.error('⚠️  Error reading receipt items for dashboard:', itemErr.message);
      }

      res.json(buildDashboardPayload(month, monthlyTxs, allTxs, receiptItems));
    } catch (err) {
      console.error('❌ Error /api/dashboard:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/transactions', requireDashboardUser, async (req, res) => {
    try {
      const month = req.query.month;
      const txs = await getTransactions(month ? { month, userId: req.userId } : { userId: req.userId });
      res.json(txs);
    } catch (err) {
      console.error('❌ Error /api/transactions:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/summary', requireDashboardUser, async (req, res) => {
    try {
      const month = req.query.month || dayjs().format('YYYY-MM');
      const txs = await getTransactions({ month, userId: req.userId });

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

  app.get('/api/trend', requireDashboardUser, async (req, res) => {
    try {
      const txs = await getTransactions({ userId: req.userId });
      const trend = buildMonthlyTrend(txs);
      res.json({ months: trend.months, income: trend.income, expense: trend.expense });
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
