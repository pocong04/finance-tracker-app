// src/services/googleSheets.js
// Service for interacting with Google Sheets to store and retrieve finance transactions.
// ------------------------------------------------------------

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const TRANSACTIONS_SHEET = 'Transactions';
const RECEIPT_ITEMS_SHEET = 'ReceiptItems';
const RECEIPT_ITEM_HEADERS = [
  'receipt_id',
  'transaction_timestamp',
  'date',
  'month',
  'store_name',
  'payment_method',
  'item_index',
  'description',
  'quantity',
  'unit_price',
  'total_price',
  'category',
  'transaction_type',
  'raw_note',
  'created_at',
];

function buildAuth() {
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    } catch (err) {
      console.error('❌ GOOGLE_CREDENTIALS_JSON tidak valid:', err.message);
    }
  }

  const CREDENTIALS_PATH = path.resolve(__dirname, '../../credentials.json');
  if (fs.existsSync(CREDENTIALS_PATH)) {
    return new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: SCOPES });
  }

  console.error('❌ Tidak ada credentials! Set GOOGLE_CREDENTIALS_JSON atau letakkan credentials.json');
  return new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: SCOPES });
}

const auth = buildAuth();

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function ensureSheetExists(title, headers = []) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = (spreadsheet.data.sheets || []).some(s => s.properties.title === title);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
  }

  if (headers.length) {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${title}!A1:Z1`,
    }).catch(() => ({ data: { values: [] } }));

    const firstRow = resp.data.values && resp.data.values[0] ? resp.data.values[0] : [];
    if (!firstRow.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${title}!A1:${String.fromCharCode(64 + headers.length)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  }
}

async function appendTransaction(tx) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  const values = [
    tx.timestamp,
    tx.date,
    tx.month,
    tx.type,
    tx.amount,
    tx.category,
    tx.note,
    tx.formattedAmount,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

async function getTransactions(opts = {}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
  });

  const rows = resp.data.values || [];
  const dataRows = rows[0] && rows[0][0] && rows[0][0].toLowerCase().includes('timestamp')
    ? rows.slice(1)
    : rows;

  const result = dataRows.map(r => ({
    timestamp: r[0],
    date: r[1],
    month: r[2],
    type: r[3],
    amount: Number(r[4]),
    category: r[5],
    note: r[6],
    formattedAmount: r[7],
  }));

  if (opts.month) return result.filter(t => t.month === opts.month);
  return result;
}

async function appendReceiptItems(receiptItems) {
  if (!Array.isArray(receiptItems) || !receiptItems.length) return;

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(RECEIPT_ITEMS_SHEET, RECEIPT_ITEM_HEADERS);
  const sheets = await getSheets();
  const values = receiptItems.map(item => [
    item.receipt_id,
    item.transaction_timestamp,
    item.date,
    item.month,
    item.store_name,
    item.payment_method,
    item.item_index,
    item.description,
    item.quantity,
    item.unit_price,
    item.total_price,
    item.category,
    item.transaction_type,
    item.raw_note,
    item.created_at,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

async function getReceiptItems(opts = {}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(RECEIPT_ITEMS_SHEET, RECEIPT_ITEM_HEADERS);
  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
  });

  const rows = resp.data.values || [];
  const dataRows = rows[0] && rows[0][0] && rows[0][0].toLowerCase().includes('receipt_id')
    ? rows.slice(1)
    : rows;

  let result = dataRows.map(r => ({
    receipt_id: r[0],
    transaction_timestamp: r[1],
    date: r[2],
    month: r[3],
    store_name: r[4],
    payment_method: r[5],
    item_index: Number(r[6]) || 0,
    description: r[7],
    quantity: Number(r[8]) || 1,
    unit_price: Number(r[9]) || 0,
    total_price: Number(r[10]) || 0,
    category: r[11],
    transaction_type: r[12],
    raw_note: r[13],
    created_at: r[14],
  }));

  if (opts.month) result = result.filter(item => item.month === opts.month);
  if (opts.receiptId) result = result.filter(item => item.receipt_id === opts.receiptId);
  if (opts.transactionTimestamp) {
    result = result.filter(item => item.transaction_timestamp === opts.transactionTimestamp);
  }
  return result;
}

async function clearAllTransactions() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
  });
}

async function clearAllReceiptItems() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  await ensureSheetExists(RECEIPT_ITEMS_SHEET, RECEIPT_ITEM_HEADERS);
  const sheets = await getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A1:O1`,
    valueInputOption: 'RAW',
    requestBody: { values: [RECEIPT_ITEM_HEADERS] },
  });
}

async function deleteLastTransaction() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TRANSACTIONS_SHEET}!A:H`,
  });
  const rows = resp.data.values ? resp.data.values.length : 0;
  if (rows <= 1) return;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheet = (spreadsheet.data.sheets || []).find(s => s.properties.title === TRANSACTIONS_SHEET);
  const numericSheetId = sheet ? sheet.properties.sheetId : 0;
  const rowIndex = rows - 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: numericSheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}

async function deleteReceiptItemsByTransactionTimestamp(timestamp) {
  if (!timestamp) return;

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const items = await getReceiptItems({});
  const remaining = items.filter(item => item.transaction_timestamp !== timestamp);
  const sheets = await getSheets();

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A:O`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${RECEIPT_ITEMS_SHEET}!A1:O1`,
    valueInputOption: 'RAW',
    requestBody: { values: [RECEIPT_ITEM_HEADERS] },
  });

  if (remaining.length) await appendReceiptItems(remaining);
}

module.exports = {
  appendTransaction,
  getTransactions,
  clearAllTransactions,
  deleteLastTransaction,
  appendReceiptItems,
  getReceiptItems,
  clearAllReceiptItems,
  deleteReceiptItemsByTransactionTimestamp,
};
