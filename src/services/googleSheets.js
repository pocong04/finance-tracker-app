// src/services/googleSheets.js
// Service for interacting with Google Sheets to store and retrieve finance transactions.
// ------------------------------------------------------------
// Prerequisites:
//   - A Google Cloud project with the Google Sheets API enabled.
//   - A service account JSON key saved as `credentials.json` in the project root.
//   - The spreadsheet ID should be set in the .env file as GOOGLE_SHEET_ID.
//
// This module exports two main functions:
//   1. appendTransaction(tx) – Append a transaction row to the sheet.
//   2. getTransactions({month}) – Retrieve transactions, optionally filtered by month.
// ------------------------------------------------------------

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

// Load service account credentials. The file must exist at the project root.
const CREDENTIALS_PATH = path.resolve(__dirname, '../../credentials.json');
const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

/**
 * Get an authorized Google Sheets client.
 */
async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * Append a transaction to the configured spreadsheet.
 * @param {Object} tx - Transaction object with the following properties:
 *   timestamp, date, month, type, amount, category, note, formattedAmount
 */
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
    range: 'Transactions!A:H', // expects a sheet named "Transactions"
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

/**
 * Retrieve transactions from the sheet.
 * @param {Object} opts
 * @param {string} [opts.month] - Optional "YYYY-MM" string to filter rows.
 * @returns {Promise<Array<Object>>}
 */
async function getTransactions(opts = {}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Transactions!A:H',
  });

  const rows = resp.data.values || [];
  // Header row is optional; if present, skip it when it contains the word "timestamp".
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

  if (opts.month) {
    return result.filter(t => t.month === opts.month);
  }
  return result;
}

module.exports = { appendTransaction, getTransactions };
