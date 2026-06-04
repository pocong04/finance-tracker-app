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
const fs = require('fs');

// Load service account credentials.
// Prioritas:
//   1. Environment variable GOOGLE_CREDENTIALS_JSON (untuk cloud/Railway) - berisi isi JSON
//   2. File credentials.json di root project (untuk lokal)
function buildAuth() {
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

  // Opsi 1: Credentials dari environment variable (cloud deployment)
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    } catch (err) {
      console.error('❌ GOOGLE_CREDENTIALS_JSON tidak valid:', err.message);
    }
  }

  // Opsi 2: Credentials dari file lokal
  const CREDENTIALS_PATH = path.resolve(__dirname, '../../credentials.json');
  if (fs.existsSync(CREDENTIALS_PATH)) {
    return new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: SCOPES });
  }

  console.error('❌ Tidak ada credentials! Set GOOGLE_CREDENTIALS_JSON atau letakkan credentials.json');
  return new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: SCOPES });
}

const auth = buildAuth();

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

/**
 * Delete ALL rows in the Transactions sheet (except header if present).
 * This is used for a full reset of the data.
 */
async function clearAllTransactions() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  // Clear all content in the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: 'Transactions!A:H',
  });
}

/**
 * Delete the last transaction row (the most recent entry).
 */
async function deleteLastTransaction() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Missing GOOGLE_SHEET_ID in .env');

  const sheets = await getSheets();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Transactions!A:H',
  });
  const rows = resp.data.values ? resp.data.values.length : 0;
  if (rows <= 1) return; // nothing to delete or only header

  // Delete last data row
  const rowIndex = rows - 1;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: 0,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}

module.exports = { appendTransaction, getTransactions, clearAllTransactions, deleteLastTransaction };
