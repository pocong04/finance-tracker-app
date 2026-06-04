// src/services/aiReceiptParser.js
// AI-powered receipt parsing menggunakan Claude API
// Mengirim OCR text ke Claude untuk parsing intelligent

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

/**
 * Parse struk menggunakan Claude AI
 * Claude akan intelligent mengerti berbagai format struk
 * @param {string} ocrText - Text hasil OCR dari foto struk
 * @returns {Promise<Object>} - {store, items[], total, date, time, payment_method}
 */
async function parseReceiptWithAI(ocrText) {
  try {
    const prompt = `Analyze this receipt text and extract structured information in JSON format.

Receipt text:
${ocrText}

Please extract and return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "store_name": "nama toko atau merchant",
  "address": "alamat jika ada, atau empty string",
  "date": "tanggal YYYY-MM-DD atau hari bulan tahun",
  "time": "waktu HH:MM:SS atau HH:MM jika ada",
  "items": [
    {
      "description": "nama item/produk",
      "quantity": 1,
      "unit_price": 10000,
      "total_price": 10000
    }
  ],
  "subtotal": 0,
  "tax": 0,
  "discount": 0,
  "total": "total pembayaran dalam angka",
  "payment_method": "cash/debit/credit/transfer/dll",
  "transaction_type": "pemasukan atau pengeluaran",
  "category": "kategori yang sesuai",
  "currency": "IDR"
}

Rules:
- Extract ALL items from the receipt
- Parse prices as numbers PRECISELY (remove Rp, dots as thousand separators, commas)
- IMPORTANT: "Rp1.500.000" = 1500000 (titik adalah pemisah ribuan, BUKAN desimal)
- IMPORTANT: "Rp 2.136" jika konteksnya saldo/transfer besar, baca angka penuh dengan benar
- If date/time not found, use current date/time
- transaction_type: Jika teks mengandung "Transfer Masuk", "uang masuk", "menerima transfer", "kredit", "saldo masuk" => "pemasukan"
- transaction_type: Jika "Transfer Keluar", "pembayaran", "belanja", "pembelian" => "pengeluaran"
- transaction_type DEFAULT untuk struk belanja toko => "pengeluaran"
- category options: makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan, gaji, freelance, investasi, tabungan, transfer, lainnya
- Untuk "Transfer Masuk" gunakan category "transfer" atau "lainnya"
- Untuk notifikasi bank/transfer, store_name = pengirim atau "Transfer Bank"
- total MUST be the EXACT amount (untuk transfer masuk, ambil nominal transfer)
- Return ONLY valid JSON, no extra text`;

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    // Parse Claude's response
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Extract JSON dari response (Claude kadang memberi markdown code block)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsedReceipt = JSON.parse(jsonStr);

    // Normalize dan validasi
    return {
      store_name: parsedReceipt.store_name || 'Unknown Store',
      address: parsedReceipt.address || '',
      date: parsedReceipt.date || new Date().toISOString().split('T')[0],
      time: parsedReceipt.time || new Date().toTimeString().substring(0, 8),
      items: Array.isArray(parsedReceipt.items) ? parsedReceipt.items : [],
      subtotal: Number(parsedReceipt.subtotal) || 0,
      tax: Number(parsedReceipt.tax) || 0,
      discount: Number(parsedReceipt.discount) || 0,
      total: Number(parsedReceipt.total) || 0,
      payment_method: parsedReceipt.payment_method || 'cash',
      transaction_type: parsedReceipt.transaction_type || 'pengeluaran',
      category: parsedReceipt.category || 'lainnya',
      currency: parsedReceipt.currency || 'IDR'
    };
  } catch (err) {
    console.error('❌ AI Receipt Parser Error:', err.message);
    throw new Error(`AI parsing failed: ${err.message}`);
  }
}

/**
 * Extract kategori smart dari item-item struk menggunakan AI
 */
async function suggestCategory(items) {
  try {
    const itemList = items.map(i => i.description).join(', ');

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Based on these receipt items: "${itemList}", what is the most appropriate transaction category?

Choose ONE from: makanan, minuman, transport, belanja, tagihan, hiburan, kesehatan, pendidikan, gaji, freelance, investasi, tabungan, lainnya

Respond with ONLY the category name, nothing else.`
        }
      ]
    });

    const category = (response.content[0].type === 'text'
      ? response.content[0].text
      : 'lainnya').trim().toLowerCase();

    const validCategories = ['makanan', 'minuman', 'transport', 'belanja', 'tagihan', 'hiburan', 'kesehatan', 'pendidikan', 'gaji', 'freelance', 'investasi', 'tabungan', 'lainnya'];

    return validCategories.includes(category) ? category : 'lainnya';
  } catch (err) {
    console.error('❌ Category suggestion error:', err.message);
    return 'lainnya';
  }
}

module.exports = { parseReceiptWithAI, suggestCategory };
