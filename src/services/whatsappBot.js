// src/services/whatsappBot.js
// WhatsApp bot handler untuk mencatat transaksi keuangan
// Menggunakan whatsapp-web.js dengan QR code authentication

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { parseTransaction, transactionSummaryMessage, helpMessage } = require('../models/transaction');
const { appendTransaction, getTransactions } = require('./googleSheets');

let transactionHistory = [];
let whatsappClient = null;

function initWhatsAppBot() {
  const enabled = process.env.WHATSAPP_ENABLED === 'true';
  if (!enabled) {
    console.log('⏭️  WhatsApp bot disabled (WHATSAPP_ENABLED=false)');
    return null;
  }

  const allowedNumbers = process.env.WHATSAPP_ALLOWED_NUMBERS
    ? process.env.WHATSAPP_ALLOWED_NUMBERS.split(',').map(s => s.trim())
    : [];

  function isAllowedNumber(from) {
    if (!allowedNumbers.length) return true;
    return allowedNumbers.includes(from);
  }

  // Cari browser yang tersedia (Edge / Chrome) agar tidak perlu download Chromium
  const fs = require('fs');
  const browserCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const executablePath = browserCandidates.find(p => {
    try { return fs.existsSync(p); } catch { return false; }
  });

  if (executablePath) {
    console.log(`🌐 WhatsApp memakai browser: ${executablePath}`);
  } else {
    console.log('⚠️  Browser (Edge/Chrome) tidak ditemukan, memakai Chromium bawaan.');
  }

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: executablePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  // QR Code untuk login
  client.on('qr', (qr) => {
    console.log('📱 Scan QR code dengan WhatsApp Anda:');
    qrcode.generate(qr, { small: true });
  });

  // Ketika bot siap
  client.on('ready', () => {
    console.log('✅ WhatsApp bot sudah siap!');
  });

  // Handler pesan
  client.on('message', async (message) => {
    const from = message.from;
    const body = message.body.trim();

    if (!isAllowedNumber(from)) {
      await message.reply('❌ Anda tidak memiliki akses ke bot ini.');
      return;
    }

    // /help
    if (body === '/help' || body === '/start') {
      await message.reply(helpMessage());
      return;
    }

    // /categories
    if (body === '/categories') {
      const text = '📁 *Kategori Tersedia:*\n\n' +
        '📤 *Pengeluaran:*\n' +
        'makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan\n\n' +
        '📥 *Pemasukan:*\n' +
        'gaji, freelance, investasi, tabungan\n\n' +
        '📎 *Lainnya:*\nlainnya';
      await message.reply(text);
      return;
    }

    // /add <jumlah> <kategori> <catatan>
    if (body.startsWith('/add ')) {
      const input = body.slice(5);
      const parsed = parseTransaction(input);

      if (parsed.error) {
        await message.reply(parsed.error);
        return;
      }

      const tx = parsed.data;
      try {
        await appendTransaction(tx);
        transactionHistory.push(tx);
        await message.reply(transactionSummaryMessage(tx));
      } catch (err) {
        console.error('❌ Error appending transaction:', err.message);
        await message.reply(`❌ Gagal menyimpan transaksi: ${err.message}`);
      }
      return;
    }

    // /undo
    if (body === '/undo') {
      if (transactionHistory.length === 0) {
        await message.reply('❌ Tidak ada transaksi untuk dihapus.');
        return;
      }

      const last = transactionHistory.pop();
      await message.reply(`✅ Transaksi dihapus:\n${transactionSummaryMessage(last)}`);
      return;
    }

    // /summary [YYYY-MM]
    if (body.startsWith('/summary')) {
      const dayjs = require('dayjs');
      const parts = body.split(/\s+/);
      const month = parts[1] || dayjs().format('YYYY-MM');

      try {
        const txs = await getTransactions({ month });
        if (txs.length === 0) {
          await message.reply(`📊 Tidak ada transaksi untuk bulan ${month}.`);
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

        await message.reply(text);
      } catch (err) {
        console.error('❌ Error fetching summary:', err.message);
        await message.reply(`❌ Gagal mengambil ringkasan: ${err.message}`);
      }
      return;
    }

    // Parse transaksi dari teks biasa
    const parsed = parseTransaction(body);
    if (parsed.error) return;

    const tx = parsed.data;
    try {
      await appendTransaction(tx);
      transactionHistory.push(tx);
      await message.reply(transactionSummaryMessage(tx));
    } catch (err) {
      console.error('❌ Error appending transaction:', err.message);
      await message.reply(`❌ Gagal menyimpan transaksi: ${err.message}`);
    }
  });

  client.initialize();
  whatsappClient = client;
  return client;
}

module.exports = { initWhatsAppBot };
