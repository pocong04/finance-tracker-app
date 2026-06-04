// src/services/telegramBot.js
// Telegram bot handler untuk mencatat transaksi keuangan
// Komando yang didukung: /add, /summary, /categories, /help, /undo

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseTransaction, transactionSummaryMessage, helpMessage } = require('../models/transaction');
const { appendTransaction, getTransactions, clearAllTransactions, deleteLastTransaction } = require('./googleSheets');
const { extractTextFromImage, parseReceiptText } = require('./ocr');

let transactionHistory = [];

// Folder sementara untuk menyimpan gambar struk yang diunduh
const TMP_DIR = path.resolve(__dirname, '../../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Unduh file dari URL ke path lokal
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function initTelegramBot(token) {
  if (!token) {
    console.error('❌ Telegram token tidak ditemukan di .env');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  // Daftar ID yang diizinkan (jika dikonfigurasi)
  const allowedIds = process.env.TELEGRAM_ALLOWED_IDS
    ? process.env.TELEGRAM_ALLOWED_IDS.split(',').map(s => s.trim())
    : [];

  function isAllowed(chatId) {
    if (!allowedIds.length) return true;
    return allowedIds.includes(String(chatId));
  }

  // Handler: /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) {
      bot.sendMessage(chatId, '❌ Anda tidak memiliki akses ke bot ini.');
      return;
    }
    bot.sendMessage(chatId, helpMessage(), { parse_mode: 'Markdown' });
  });

  // Handler: /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;
    bot.sendMessage(chatId, helpMessage(), { parse_mode: 'Markdown' });
  });

  // Handler: /categories
  bot.onText(/\/categories/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;
    const text = '📁 *Kategori Tersedia:*\n\n' +
      '📤 *Pengeluaran:*\n' +
      'makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan\n\n' +
      '📥 *Pemasukan:*\n' +
      'gaji, freelance, investasi, tabungan\n\n' +
      '📎 *Lainnya:*\nlainnya';
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  });

  // Handler: /add <jumlah> <kategori> <catatan>
  bot.onText(/\/add\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;

    const input = match[1];
    const parsed = parseTransaction(input);

    if (parsed.error) {
      bot.sendMessage(chatId, parsed.error, { parse_mode: 'Markdown' });
      return;
    }

    const tx = parsed.data;
    try {
      await appendTransaction(tx);
      transactionHistory.push(tx);
      bot.sendMessage(chatId, transactionSummaryMessage(tx), { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Error appending transaction:', err.message);
      bot.sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${err.message}`);
    }
  });

  // Handler: /undo atau /delete (hapus transaksi terakhir dari Google Sheet)
  bot.onText(/\/(undo|delete)/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;

    try {
      const all = await getTransactions({});
      if (all.length === 0) {
        bot.sendMessage(chatId, '❌ Tidak ada transaksi untuk dihapus.');
        return;
      }

      const last = all[all.length - 1];
      await deleteLastTransaction();
      // Sinkronkan history lokal
      transactionHistory.pop();

      bot.sendMessage(chatId,
        `✅ *Transaksi Terakhir Dihapus!*\n\n` +
        `💵 Jumlah: ${last.formattedAmount || ('Rp ' + Number(last.amount).toLocaleString('id-ID'))}\n` +
        `🏷️ Kategori: ${last.category}\n` +
        `📝 Catatan: ${last.note}`,
        { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Error delete:', err.message);
      bot.sendMessage(chatId, `❌ Gagal menghapus transaksi: ${err.message}`);
    }
  });

  // Handler: /reset (hapus SEMUA transaksi) - butuh konfirmasi
  const pendingReset = {}; // chatId -> true jika menunggu konfirmasi

  bot.onText(/\/reset/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;

    pendingReset[chatId] = true;
    bot.sendMessage(chatId,
      `⚠️ *PERINGATAN: Hapus Semua Data?*\n\n` +
      `Semua transaksi di Google Sheet akan dihapus PERMANEN.\n\n` +
      `Ketik *YA* untuk konfirmasi, atau *BATAL* untuk membatalkan.`,
      { parse_mode: 'Markdown' });
  });

  // Handler konfirmasi reset (cek di message handler global)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;
    if (!msg.text) return;
    if (!pendingReset[chatId]) return; // Hanya proses jika sedang menunggu konfirmasi reset

    const answer = msg.text.trim().toUpperCase();
    if (answer === 'YA') {
      delete pendingReset[chatId];
      try {
        await clearAllTransactions();
        transactionHistory.length = 0;
        bot.sendMessage(chatId, '✅ *Semua data berhasil dihapus!*\n\nGoogle Sheet sekarang kosong. Anda bisa mulai mencatat dari awal.', { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('❌ Error reset:', err.message);
        bot.sendMessage(chatId, `❌ Gagal reset data: ${err.message}`);
      }
    } else if (answer === 'BATAL') {
      delete pendingReset[chatId];
      bot.sendMessage(chatId, '✅ Reset dibatalkan. Data Anda aman.');
    }
  });

  // Handler: /summary [YYYY-MM]
  bot.onText(/\/summary(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;

    const month = match[1] || new (require('dayjs'))().format('YYYY-MM');

    try {
      const txs = await getTransactions({ month });
      if (txs.length === 0) {
        bot.sendMessage(chatId, `📊 Tidak ada transaksi untuk bulan ${month}.`);
        return;
      }

      let income = 0, expense = 0;
      txs.forEach(t => {
        if (t.type === 'pemasukan') income += t.amount;
        else expense += t.amount;
      });

      const text = `📊 *Ringkasan Keuangan - ${month}*\n\n` +
        `📥 *Pemasukan:* Rp ${income.toLocaleString('id-ID')}\n` +
        `📤 *Pengeluaran:* Rp ${expense.toLocaleString('id-ID')}\n` +
        `💰 *Saldo:* Rp ${(income - expense).toLocaleString('id-ID')}\n` +
        `📝 *Total Transaksi:* ${txs.length}`;

      bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Error fetching summary:', err.message);
      bot.sendMessage(chatId, `❌ Gagal mengambil ringkasan: ${err.message}`);
    }
  });

  // Handler: pesan teks tanpa komando (parse langsung)
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;
    if (!msg.text) return; // Skip foto/media (ditangani terpisah)
    if (msg.text.startsWith('/')) return; // Skip komando

    const parsed = parseTransaction(msg.text);
    if (parsed.error) return; // Abaikan teks yang tidak valid

    const tx = parsed.data;
    try {
      await appendTransaction(tx);
      transactionHistory.push(tx);
      bot.sendMessage(chatId, transactionSummaryMessage(tx), { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('❌ Error appending transaction:', err.message);
      bot.sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${err.message}`);
    }
  });

  // ============================================
  // Handler: FOTO STRUK / GAMBAR (OCR)
  // ============================================
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (!isAllowed(chatId)) return;

    // Ambil foto resolusi tertinggi (terakhir di array)
    const photo = msg.photo[msg.photo.length - 1];
    const caption = msg.caption || '';

    bot.sendMessage(chatId, '🔍 Sedang membaca struk...');

    try {
      // Download foto dari Telegram
      const fileInfo = await bot.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
      const localPath = path.join(TMP_DIR, `struk_${Date.now()}.jpg`);
      await downloadFile(fileUrl, localPath);

      // OCR: baca teks dari gambar
      const text = await extractTextFromImage(localPath);
      const receipt = parseReceiptText(text);

      // Hapus file sementara
      fs.unlink(localPath, () => {});

      if (receipt.amount > 0) {
        // Cek apakah user kirim caption manual (misal: "makanan" atau "50000 makanan makan siang")
        let tx;
        if (caption) {
          const parsed = parseTransaction(caption);
          if (!parsed.error) {
            tx = parsed.data;
          }
        }

        // Jika tidak ada caption valid, gunakan hasil OCR
        if (!tx) {
          const dayjs = require('dayjs');
          tx = {
            timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            date: dayjs().format('YYYY-MM-DD'),
            month: dayjs().format('YYYY-MM'),
            type: 'pengeluaran',
            amount: receipt.amount,
            category: receipt.category,
            note: `[Struk] ${receipt.note.substring(0, 80)}`,
            formattedAmount: 'Rp ' + receipt.amount.toLocaleString('id-ID'),
          };
        }

        await appendTransaction(tx);
        transactionHistory.push(tx);

        const summaryMsg = `📸 *Struk Berhasil Dibaca!*\n\n` +
          `📅 Tanggal: ${tx.date}\n` +
          `💵 Jumlah: ${tx.formattedAmount}\n` +
          `🏷️ Kategori: ${tx.category}\n` +
          `📝 Catatan: ${tx.note}\n\n` +
          `✅ Transaksi tersimpan di Google Sheet!`;

        bot.sendMessage(chatId, summaryMsg, { parse_mode: 'Markdown' });
      } else {
        // OCR tidak menemukan angka - tampilkan teks mentah
        const failMsg = `⚠️ *Tidak bisa membaca jumlah dari struk.*\n\n` +
          `📄 Teks yang terbaca:\n\`\`\`\n${receipt.fullText.substring(0, 300)}\n\`\`\`\n\n` +
          `💡 *Tips:* Kirim foto struk disertai caption manual, contoh:\n` +
          `_50000 makanan nasi goreng_`;

        bot.sendMessage(chatId, failMsg, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      console.error('❌ Error OCR struk:', err.message);
      bot.sendMessage(chatId, `❌ Gagal membaca struk: ${err.message}\n\n💡 Coba kirim ulang dengan foto yang lebih jelas, atau ketik manual:\n_50000 makanan nasi goreng_`, { parse_mode: 'Markdown' });
    }
  });

  console.log('✅ Telegram bot sudah siap!');
  return bot;
}

module.exports = { initTelegramBot };
