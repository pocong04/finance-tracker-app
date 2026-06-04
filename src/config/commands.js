// src/config/commands.js
// Daftar semua commands untuk BotFather dan inline menu

const COMMANDS = [
  {
    command: 'start',
    description: 'Mulai bot & tampilkan bantuan'
  },
  {
    command: 'menu',
    description: '📱 Tampilkan menu tombol interaktif'
  },
  {
    command: 'help',
    description: 'Tampilkan bantuan lengkap'
  },
  {
    command: 'add',
    description: 'Catat transaksi: /add 50k makanan atau 50k makanan nasi goreng'
  },
  {
    command: 'summary',
    description: 'Ringkasan bulan ini atau tertentu: /summary atau /summary 2026-06'
  },
  {
    command: 'categories',
    description: 'Lihat daftar kategori yang tersedia'
  },
  {
    command: 'export',
    description: 'Export ke Excel: /export (bulan ini) atau /export 2026-05'
  },
  {
    command: 'undo',
    description: 'Hapus transaksi terakhir'
  },
  {
    command: 'delete',
    description: 'Hapus transaksi terakhir (alias /undo)'
  },
  {
    command: 'reset',
    description: 'Hapus SEMUA data (perlu konfirmasi)'
  },
  {
    command: 'dashboard',
    description: 'Buka link dashboard web keuangan Anda'
  }
];

// Menu keyboard inline
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

// Menu extended (More options)
const MENU_MORE_BUTTONS = [
  [
    { text: '🌐 Dashboard', callback_data: 'menu_dashboard' },
    { text: '📁 Kategori', callback_data: 'menu_categories' }
  ],
  [
    { text: '⚠️ Reset Data', callback_data: 'menu_reset' },
    { text: '❓ Bantuan', callback_data: 'menu_help' }
  ],
  [
    { text: '◀️ Kembali', callback_data: 'menu_main' }
  ]
];

module.exports = {
  COMMANDS,
  MENU_BUTTONS,
  MENU_MORE_BUTTONS
};
