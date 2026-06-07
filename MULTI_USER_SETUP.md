# 🚀 Multi-User Finance Tracker Setup Guide

Panduan lengkap untuk mengonfigurasi Finance Tracker sebagai aplikasi multi-user dengan data isolation per Telegram user.

## 📋 Ringkasan Perubahan

### Apa Yang Berubah?

✅ **Google Sheets Schema**: Ditambah kolom ownership (`user_id`, `user_name`, `chat_id`)  
✅ **Telegram Bot**: User context di-attach ke setiap transaksi  
✅ **Dashboard**: Dilindungi dengan token-based authentication  
✅ **Menu Handlers**: Scoped by user - hanya data milik user yang ditampilkan  
✅ **Destructive Commands**: `/reset`, `/undo` hanya affect user's own data  

### Data Preservation

✅ **Existing personal data tetap aman**: Kolom ownership ditambahkan di akhir, data lama tidak berubah  
✅ **Legacy owner assignment**: Data lama dengan owner field kosong dianggap milik LEGACY_TELEGRAM_USER_ID  
✅ **Zero data loss**: Implementasi non-destructive, header-only extension  

---

## 🔧 Step-by-Step Setup

### Step 1: Identify Your Telegram User ID

Saat user pertama kali menjalankan bot atau mengirim `/start`, aplikasi akan log Telegram user ID. 
Atau gunakan cara ini:

1. Buka bot Telegram Anda
2. Kirim `/start`
3. Lihat di console aplikasi:
   ```
   Telegram user dari: 123456789  (ini adalah msg.from.id)
   Chat ID: 987654321  (ini adalah msg.chat.id)
   ```

**Untuk private chat**, biasanya `msg.from.id` ≈ `msg.chat.id`.

### Step 2: Generate Dashboard Tokens

Generate random tokens untuk setiap user yang akan akses dashboard:

**Linux/Mac:**
```bash
openssl rand -hex 32
```

**Windows (PowerShell):**
```powershell
$bytes = [System.Text.Encoding]::UTF8.GetBytes((Get-Random 10000000))
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
[System.BitConverter]::ToString($hash).Replace('-', '').ToLower()
```

**Contoh output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Step 3: Update Environment Variables

Edit `.env` file dengan konfigurasi multi-user Anda:

```env
# ====== Telegram Setup ======
TELEGRAM_TOKEN=your_bot_token_from_botfather
TELEGRAM_ALLOWED_IDS=owner_id,user2_id,user3_id

# ====== Multi-user Legacy Owner (existing data belongs to this user) ======
LEGACY_TELEGRAM_USER_ID=owner_id
LEGACY_TELEGRAM_CHAT_ID=owner_chat_id
LEGACY_USER_NAME=Pocong

# ====== Admin Users (can run /setup_sheets) ======
TELEGRAM_ADMIN_IDS=owner_id

# ====== Dashboard Access Tokens (format: userId:token,userId:token) ======
DASHBOARD_ACCESS_TOKENS=owner_id:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6,user2_id:x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k,user3_id:token_for_user3_here

# ====== Dashboard URL ======
DASHBOARD_URL=https://your-app.up.railway.app

# ====== Lainnya ======
PORT=3000
GOOGLE_SHEET_ID=your_sheet_id
MONTHLY_BUDGET=5000000
```

### Step 4: Redeploy ke Railway

```bash
git add .env.example src/ public/
git commit -m "Implement multi-user support with data isolation"
git push origin main
```

Railway akan otomatis redeploy. Tunggu build selesai.

### Step 5: First Launch - Header Migration

Saat aplikasi startup pertama kali setelah deploy:

1. App membaca existing Google Sheets headers
2. Jika headers belum ada kolom ownership → extend headers dengan kolom baru
3. Existing data rows tetap di tempat (tidak berubah)
4. Siap untuk transaksi baru dengan user context

**Di console, Anda akan lihat:**
```
✅ Dashboard berjalan di https://your-app.up.railway.app
✅ Menu commands terdaftar di Telegram
```

---

## 📱 Usage For Multiple Users

### Owner (Legacy User)

Owner dapat menggunakan bot seperti biasa. Existing data dari owner akan tetap visible:

```
User (owner): 50k makanan
Bot: ✅ Transaksi disimpan

User (owner): /summary
Bot: 📊 Ringkasan... (hanya data milik owner)

User (owner): /dashboard
Bot: 🌐 Dashboard Pribadi Anda
     Link: https://your-app.up.railway.app?token=owner_token
     [🌐 Buka Dashboard] (button)
```

**Dashboard pribadi owner:**
- URL: `https://your-app.up.railway.app?token=owner_token`
- Hanya melihat data milik owner (termasuk data lama)
- Tidak bisa melihat data user lain

### New User (User2)

User baru dapat ditambahkan dengan:

1. **Add Telegram ID ke TELEGRAM_ALLOWED_IDS:**
   ```env
   TELEGRAM_ALLOWED_IDS=owner_id,user2_id
   ```

2. **Generate dashboard token untuk User2:**
   ```
   user2_token: x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4
   ```

3. **Add ke DASHBOARD_ACCESS_TOKENS:**
   ```env
   DASHBOARD_ACCESS_TOKENS=owner_id:owner_token,user2_id:x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4
   ```

4. **Redeploy Railway**

5. **User2 di Telegram:**
   ```
   User2: /start
   Bot: Selamat datang!

   User2: 100rb transport bensin
   Bot: ✅ Transaksi disimpan (hanya untuk user2)

   User2: /summary
   Bot: 📊 Ringkasan... (hanya data user2, tidak termasuk owner data)

   User2: /dashboard
   Bot: 🌐 Dashboard Pribadi Anda
        Link: https://your-app.up.railway.app?token=user2_token
        [🌐 Buka Dashboard] (button)
   ```

**Dashboard pribadi user2:**
- URL: `https://your-app.up.railway.app?token=user2_token`
- Hanya melihat data milik user2 saja
- Tidak bisa melihat data owner atau user lain

---

## 🔐 Security Notes

### Token Safety

- Dashboard tokens disimpan di environment variable `.env`
- Tokens adalah 64-character random strings (crypto-secure)
- Tokens NOT expiring di MVP ini (dapat ditambahkan di masa depan)
- Token dalam URL dapat di-copy, tapi tanpa token yang valid, dashboard tidak accessible

### Data Isolation

- **Transaksi user A tidak bisa dilihat user B**, bahkan dengan URL parameter manipulation
- Sistem menggunakan server-side user context (token → userId)
- Semua API calls divalidasi di backend sebelum return data
- `/undo` dan `/reset` hanya affect user's own data

### Admin Commands

- `/setup_sheets` hanya bisa dijalankan oleh users di `TELEGRAM_ADMIN_IDS`
- Default: admin = legacy owner (jika `TELEGRAM_ADMIN_IDS` kosong)

---

## 📊 Google Sheets Schema

### Transactions Sheet

**Columns A-H (Existing):**
```
timestamp | date | month | type | amount | category | note | formatted_amount
```

**Columns I-K (New - User Ownership):**
```
user_id | user_name | chat_id
```

**Example Row:**
```
2026-06-07 14:30:00 | 2026-06-07 | 2026-06 | pengeluaran | 50000 | makanan | nasi goreng | Rp 50.000 | 123456789 | @pocong | 123456789
```

### ReceiptItems Sheet

**Columns A-O (Existing):**
```
receipt_id | transaction_timestamp | date | ... | created_at
```

**Columns P-R (New - User Ownership):**
```
user_id | user_name | chat_id
```

---

## 🧪 Testing Checklist

- [ ] Owner can access Telegram bot, send `/start`
- [ ] Owner can add transaction: `50k makanan`
- [ ] Owner can see own summary: `/summary`
- [ ] Owner can export own data: `/export`
- [ ] Owner can access dashboard with token URL
- [ ] Owner dashboard only shows own data
- [ ] Owner can `/undo` own last transaction
- [ ] Owner can `/reset` (deletes only owner's data)
- [ ] New user can access bot (if added to TELEGRAM_ALLOWED_IDS)
- [ ] New user data doesn't mix with owner data
- [ ] New user `/summary` shows only new user's transactions
- [ ] New user dashboard token shows only new user's data
- [ ] Without token, dashboard returns 401 Unauthorized
- [ ] Old data (pre-migration) still visible to owner

---

## 🚀 Future Improvements (Not in MVP)

- [ ] Per-user budgets instead of global budget
- [ ] Expiring dashboard tokens (TTL)
- [ ] OAuth login for dashboard
- [ ] Invite system for sharing data
- [ ] Multi-user spreadsheet per workspace
- [ ] WhatsApp multi-user scoping
- [ ] Rate limiting per user
- [ ] Usage analytics per user

---

## ⚠️ Known Limitations (MVP)

- **WhatsApp bot**: Currently not multi-user scoped (admin/legacy-only for MVP)
- **Dashboard tokens**: No expiration (permanent valid)
- **Budget**: Global for all users (not per-user)
- **Categories**: Shared across users
- **Google Sheets**: Data visible in one sheet (but queries are scoped)

---

## 📞 Troubleshooting

### "Unauthorized: Missing or invalid dashboard token"

**Cause**: User trying to access dashboard without token or with wrong token

**Fix**: 
1. Verify token is set in DASHBOARD_ACCESS_TOKENS
2. Regenerate token if needed
3. Resend dashboard link from bot

### "Error: clearAllTransactions requires userId or allUsers=true"

**Cause**: Someone trying to call unscoped global clear (shouldn't happen in normal flow)

**Fix**: This is a safety guard. Report if seen in user commands.

### Old data not showing for owner

**Cause**: Owner's Telegram ID not set as LEGACY_TELEGRAM_USER_ID

**Fix**:
1. Get owner's Telegram ID from bot logs
2. Set LEGACY_TELEGRAM_USER_ID=owner_id
3. Redeploy

### New user can see old data

**Cause**: New user's ID accidentally matches or LEGACY setting is wrong

**Fix**:
1. Verify each user has unique Telegram ID
2. Check LEGACY_TELEGRAM_USER_ID setting
3. Restart bot

---

## 📚 Architecture Overview

```
Telegram User A
    ↓
msg.from.id = 123456789
    ↓
getTelegramUserContext()
    ↓
userId: "123456789"
    ↓
appendTransaction(tx, userContext)
    ↓
Google Sheets [user_id="123456789"]
    ↓
getTransactions({ userId: "123456789" })
    ↓
Private Dashboard with token=user_a_token
```

Same for User B, User C, etc. Data completely isolated.

---

**Happy multi-user finance tracking! 🎉**
