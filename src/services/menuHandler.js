// src/services/menuHandler.js
// Interactive menu system untuk Telegram bot
// Menangani callback queries dan inline keyboards

const { getTransactions, clearAllTransactions, deleteLastTransaction, getReceiptItems } = require('./googleSheets');
const { exportToExcel } = require('./excelExporter');
const dayjs = require('dayjs');

function getDashboardUrl() {
  const configuredUrl = process.env.DASHBOARD_URL;
  if (configuredUrl) return configuredUrl;

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain) return `https://${railwayDomain}`;

  return 'http://localhost:3000';
}

// ====== NEW: Get user context from callback query ======
function getCallbackUserContext(callbackQuery) {
  const from = callbackQuery.from || {};
  const chatId = callbackQuery.message.chat.id;
  return {
    userId: String(from.id || chatId),
    chatId: String(chatId),
    userName: from.username
      ? `@${from.username}`
      : [from.first_name, from.last_name].filter(Boolean).join(' ') || String(chatId),
  };
}

/**
 * Tampilkan main menu dengan inline buttons
 */
function showMainMenu(chatId, bot) {
  const MENU_BUTTONS = [
    [
      { text: '💰 Catat Transaksi', callback_data: 'menu_add' },
      { text: '📊 Ringkasan', callback_data: 'menu_summary' }
    ],
    [
      { text: '📋 Kategori', callback_data: 'menu_categories' },
      { text: '📥 Export Excel', callback_data: 'menu_export' }
    ],
    [
      { text: '🗑️ Hapus Terakhir', callback_data: 'menu_undo' },
      { text: '⚙️ Lainnya', callback_data: 'menu_more' }
    ]
  ];

  const text = `📱 *Menu Catatan Keuangan Pocong*

Pilih salah satu opsi di bawah:`;

  bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: MENU_BUTTONS }
  });
}

/**
 * Tampilkan extended menu (More options)
 */
function showMoreMenu(chatId, bot) {
  const MENU_MORE = [
    [
      { text: '🌐 Dashboard', callback_data: 'menu_dashboard' },
      { text: '📁 Lihat Kategori', callback_data: 'menu_categories' }
    ],
    [
      { text: '⚠️ Reset Semua Data', callback_data: 'menu_reset' },
      { text: '❓ Bantuan', callback_data: 'menu_help' }
    ],
    [
      { text: '◀️ Kembali ke Menu', callback_data: 'menu_main' }
    ]
  ];

  const text = `⚙️ *Menu Lainnya*

Pilih opsi tambahan:`;

  bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: MENU_MORE }
  });
}

/**
 * Handle callback queries (button clicks)
 */
async function handleCallbackQuery(callbackQuery, bot) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  try {
    switch (data) {
      case 'menu_main':
        showMainMenu(chatId, bot);
        break;

      case 'menu_add':
        bot.sendMessage(chatId,
          `💰 *Catat Transaksi*\n\n` +
          `Ketik format:\n` +
          `• \`50k makanan nasi goreng\`\n` +
          `• \`+2jt gaji gaji bulan ini\`\n` +
          `• \`100rb bensin\`\n\n` +
          `Atau kirim foto struk untuk OCR otomatis!`,
          { parse_mode: 'Markdown' });
        break;

      case 'menu_summary':
        const userContext = getCallbackUserContext(callbackQuery);
        const txs = await getTransactions({ month: dayjs().format('YYYY-MM'), userId: userContext.userId });
        let income = 0, expense = 0;
        txs.forEach(t => {
          if (t.type === 'pemasukan') income += Number(t.amount);
          else expense += Number(t.amount);
        });

        const summaryText = `📊 *Ringkasan Bulan ${dayjs().format('MMMM YYYY')}*\n\n` +
          `📥 *Pemasukan:* Rp ${income.toLocaleString('id-ID')}\n` +
          `📤 *Pengeluaran:* Rp ${expense.toLocaleString('id-ID')}\n` +
          `💰 *Saldo:* Rp ${(income - expense).toLocaleString('id-ID')}\n` +
          `📝 *Total Transaksi:* ${txs.length}`;

        bot.sendMessage(chatId, summaryText, { parse_mode: 'Markdown' });
        break;

      case 'menu_categories':
        const catText = `📁 *Kategori Tersedia*\n\n` +
          `📤 *Pengeluaran:*\nmakanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan\n\n` +
          `📥 *Pemasukan:*\ngaji, freelance, investasi, tabungan\n\n` +
          `📎 *Lainnya:*\nlainnya`;

        bot.sendMessage(chatId, catText, { parse_mode: 'Markdown' });
        break;

      case 'menu_export':
        const userContextExport = getCallbackUserContext(callbackQuery);
        const month = dayjs().format('YYYY-MM');
        bot.sendMessage(chatId, '📊 Sedang membuat file Excel...');
        const txsExport = await getTransactions({ month, userId: userContextExport.userId });
        if (txsExport.length === 0) {
          bot.sendMessage(chatId, '❌ Tidak ada transaksi Anda bulan ini');
        } else {
          let receiptItemsExport = [];
          try {
            receiptItemsExport = await getReceiptItems({ month, userId: userContextExport.userId });
          } catch (itemErr) {
            console.error('⚠️  Gagal mengambil detail item struk:', itemErr.message);
          }
          const filepath = await exportToExcel(txsExport, month, receiptItemsExport);
          bot.sendDocument(chatId, filepath, {
            caption: `✅ Laporan ${month}\n📋 ${txsExport.length} transaksi\n🧾 Detail item: ${receiptItemsExport.length}`
          });
        }
        break;

      case 'menu_undo':
        bot.sendMessage(chatId, '🗑️ Ketik `/undo` untuk hapus transaksi terakhir', { parse_mode: 'Markdown' });
        break;

      case 'menu_more':
        showMoreMenu(chatId, bot);
        break;

      case 'menu_dashboard':
        const userContextDash = getCallbackUserContext(callbackQuery);
        const dashboardUrl = getDashboardUrl();
        const dashboardToken = process.env.DASHBOARD_ACCESS_TOKENS
          ? process.env.DASHBOARD_ACCESS_TOKENS.split(',')
              .map(pair => pair.trim())
              .find(pair => pair.startsWith(userContextDash.userId + ':'))
              ?.split(':')[1]
          : null;

        const tokenUrl = dashboardToken
          ? `${dashboardUrl}?token=${encodeURIComponent(dashboardToken)}`
          : dashboardUrl;

        bot.sendMessage(chatId,
          `🌐 *Dashboard Keuangan Anda*\n\n` +
          `Link dashboard pribadi Anda:\n${tokenUrl}`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '🌐 Buka Dashboard', url: tokenUrl }
              ]]
            }
          });
        break;

      case 'menu_reset':
        bot.sendMessage(chatId,
          `⚠️ *PERINGATAN: Reset Data*\n\n` +
          `Ini akan menghapus SEMUA transaksi milik Anda saja.\n` +
          `Data pengguna lain tidak akan dihapus.\n\n` +
          `Ketik \`/reset\` untuk lanjutkan`,
          { parse_mode: 'Markdown' });
        break;

      case 'menu_help':
        const helpText = `❓ *Bantuan - Format Input*\n\n` +
          `*Pengeluaran:*\n` +
          `\`50k makanan\` → Rp 50.000 untuk makanan\n` +
          `\`2jt belanja\` → Rp 2.000.000 untuk belanja\n\n` +
          `*Pemasukan:*\n` +
          `\`+5jt gaji\` → Rp 5.000.000 gaji masuk\n` +
          `\`terima 500rb\` → Rp 500.000 diterima\n\n` +
          `*Atau:*\n` +
          `📸 Kirim foto struk untuk auto-parse\n` +
          `/summary → Ringkasan\n` +
          `/export → Download Excel`;

        bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
        break;
    }
  } catch (err) {
    console.error('❌ Error menu handler:', err.message);
    bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }

  // Answer callback query
  bot.answerCallbackQuery(callbackQuery.id);
}

module.exports = { showMainMenu, showMoreMenu, handleCallbackQuery };
