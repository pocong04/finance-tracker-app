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
  "currency": "IDR"
}

Rules:
- Extract ALL items from the receipt
- Parse prices as numbers (remove Rp, commas, periods except decimal)
- If date/time not found, use current date/time
- If payment method unclear, default to "cash"
- If store name unclear, use first line of receipt
- total MUST be the final amount paid
- Items should be array of objects with description and price
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
