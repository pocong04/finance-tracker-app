// src/services/geminiReceiptParser.js
// AI-powered receipt parsing menggunakan Google Gemini Vision
// KEUNGGULAN: Gemini bisa baca GAMBAR langsung tanpa OCR (lebih akurat)

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Inisialisasi Gemini (perlu GEMINI_API_KEY di environment)
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/**
 * Konversi file gambar ke format yang Gemini butuhkan
 */
function fileToGenerativePart(imagePath) {
  const data = fs.readFileSync(imagePath).toString('base64');
  // Deteksi mime type dari ekstensi
  const ext = imagePath.split('.').pop().toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  return {
    inlineData: { data, mimeType },
  };
}

function extractJsonObject(text) {
  let jsonStr = String(text || '').trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) return jsonMatch[1].trim();

  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return jsonStr.slice(firstBrace, lastBrace + 1);
  }

  return jsonStr;
}

function parseCurrency(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const raw = String(value).toLowerCase();
  const cleaned = raw
    .replace(/rp|idr|\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');

  if (!cleaned) return 0;

  // Singkatan umum: 50rb, 2jt, 1.5jt
  if (raw.includes('jt') || raw.includes('juta')) return (Number(cleaned) || 0) * 1000000;
  if (raw.includes('rb') || raw.includes('ribu') || raw.includes('k')) return (Number(cleaned) || 0) * 1000;

  // Format Indonesia: 1.500.000 => 1500000
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, '')) || 0;
  }

  return Number(cleaned.replace(/\./g, '')) || Number(cleaned) || 0;
}

/**
 * Parse struk LANGSUNG dari gambar menggunakan Gemini Vision
 * Tidak perlu OCR — Gemini baca gambar secara native
 * @param {string} imagePath - Path ke file gambar struk
 * @returns {Promise<Object>} - Detail transaksi terstruktur
 */
async function parseReceiptImageWithGemini(imagePath) {
  if (!genAI) throw new Error('GEMINI_API_KEY belum di-set');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Analisa gambar struk/bukti transaksi ini dan ekstrak informasi dalam format JSON.

Kembalikan HANYA JSON valid (tanpa markdown, tanpa code block) dengan struktur:
{
  "store_name": "nama toko/merchant/pengirim",
  "date": "tanggal YYYY-MM-DD",
  "time": "waktu HH:MM",
  "items": [
    { "description": "nama item", "quantity": 1, "total_price": 10000 }
  ],
  "total": 50000,
  "payment_method": "cash/debit/credit/transfer/qris",
  "transaction_type": "pemasukan atau pengeluaran",
  "category": "kategori yang sesuai"
}

ATURAN PENTING:
- Parse angka dengan TEPAT: "Rp1.500.000" = 1500000 (titik = pemisah ribuan)
- transaction_type: jika "Transfer Masuk", "uang masuk", "menerima transfer", "saldo masuk", "kredit" => "pemasukan"
- transaction_type: jika "Transfer Keluar", "pembayaran", "belanja", "pembelian", struk toko => "pengeluaran"
- Untuk struk belanja toko (Indomaret, Alfamart, resto, dll) => "pengeluaran"
- Untuk notifikasi transfer masuk bank => "pemasukan"
- category options: makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan, gaji, freelance, investasi, tabungan, transfer, lainnya
- Untuk transfer masuk gunakan category "transfer"
- total HARUS nominal transaksi yang BENAR & PERSIS
- Jika ini notifikasi transfer, store_name = nama pengirim atau "Transfer Masuk"
- Kembalikan HANYA JSON, tanpa teks tambahan`;

  try {
    const imagePart = fileToGenerativePart(imagePath);
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    // Extract JSON dari response (kadang Gemini menambah teks/markdown)
    const parsed = JSON.parse(extractJsonObject(responseText));
    const total = parseCurrency(parsed.total || parsed.amount || parsed.nominal);

    return {
      store_name: parsed.store_name || parsed.merchant || parsed.sender || 'Struk',
      address: parsed.address || '',
      date: parsed.date || new Date().toISOString().split('T')[0],
      time: parsed.time || new Date().toTimeString().substring(0, 5),
      items: Array.isArray(parsed.items) ? parsed.items : [],
      total,
      payment_method: parsed.payment_method || 'cash',
      transaction_type: parsed.transaction_type || parsed.type || 'pengeluaran',
      category: parsed.category || parsed.suggested_category || 'lainnya',
      currency: 'IDR',
    };
  } catch (err) {
    console.error('❌ Gemini Receipt Parser Error:', err.message);
    throw new Error(`Gemini parsing gagal: ${err.message}`);
  }
}

/**
 * Parse teks transaksi natural language dengan Gemini
 * Contoh: "saya transfer ke teman 500rb" => pengeluaran, transport
 */
async function parseTextWithGemini(text) {
  if (!genAI) throw new Error('GEMINI_API_KEY belum di-set');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Analisa kalimat transaksi keuangan ini: "${text}"

Kembalikan HANYA JSON (tanpa markdown):
{
  "amount": 50000,
  "type": "pemasukan atau pengeluaran",
  "category": "kategori",
  "note": "deskripsi singkat"
}

ATURAN:
- Parse jumlah: 50k=50000, 2jt=2000000, 100rb=100000, 1.5jt=1500000
- type "pemasukan" jika: terima, dapat, gaji, masuk, transfer masuk, bonus
- type "pengeluaran" jika: bayar, beli, belanja, makan, keluar
- category: makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan, gaji, freelance, investasi, tabungan, transfer, lainnya
- Kembalikan HANYA JSON valid`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const parsed = JSON.parse(extractJsonObject(responseText));
    return {
      amount: parseCurrency(parsed.amount || parsed.total || parsed.nominal),
      type: parsed.type || parsed.transaction_type || 'pengeluaran',
      category: parsed.category || 'lainnya',
      note: parsed.note || text,
    };
  } catch (err) {
    console.error('❌ Gemini Text Parser Error:', err.message);
    throw new Error(`Gemini text parsing gagal: ${err.message}`);
  }
}

const GEMINI_ENABLED = !!genAI;

module.exports = { parseReceiptImageWithGemini, parseTextWithGemini, GEMINI_ENABLED };
