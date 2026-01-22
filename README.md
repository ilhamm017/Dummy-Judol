# 🎰 Roulette Gambling Website

Website judi roulette full-stack dengan panel admin untuk mengatur kesempatan menang member.

## 🚀 Fitur

### Member
- 🎡 **Permainan Roulette** dengan animasi roda yang realistis
- 💰 **Sistem Taruhan** - Angka spesifik, Merah/Hitam, Ganjil/Genap
- 💳 **Deposit via GoPay** dengan upload bukti transfer
- 📊 **Riwayat Permainan** lengkap dengan detail taruhan
- 🔐 **Autentikasi** dengan JWT token

### Admin
- ✅ **Verifikasi Deposit** - Approve/reject permintaan deposit
- 👥 **Manajemen User** - Edit saldo dan win rate per user
- ⚙️ **Pengaturan Win Rate** - Kontrol kesempatan menang global dan per user
- 📈 **Dashboard Statistik** - Total user, permainan, dan profit
- 🎯 **Win Rate Manipulation** - Sistem otomatis untuk mengatur hasil permainan

## 🛠️ Teknologi

- **Backend:** Node.js + Express.js
- **Database:** SQLite + Sequelize ORM
- **Frontend:** HTML + CSS + JavaScript (Vanilla)
- **Autentikasi:** JWT (JSON Web Tokens)
- **Upload:** Multer untuk bukti transfer
- **Arsitektur:** MVC (Model-View-Controller)

## 📦 Instalasi

```bash
# Install dependencies
npm install

# Jalankan server
npm start

# Development mode dengan nodemon
npm run dev
```

Server akan berjalan di `http://localhost:3000`

## 🔑 Default Admin Account

```
Username: admin
Password: admin123
Email: admin@roulette.com
```

**PENTING:** Ganti password admin setelah login pertama kali!

## 📁 Struktur Folder

```
Dummy-Judol/
├── config/
│   └── database.js          # Konfigurasi Sequelize
├── models/
│   ├── User.js              # Model user dengan password hashing
│   ├── GameSettings.js      # Model pengaturan game
│   ├── GameHistory.js       # Model riwayat permainan
│   ├── DepositRequest.js    # Model permintaan deposit
│   └── index.js             # Aggregator models
├── controllers/
│   ├── authController.js    # Login & registrasi
│   ├── gameController.js    # Logika roulette & win rate
│   ├── depositController.js # Manajemen deposit
│   └── adminController.js   # Panel admin
├── routes/
│   ├── authRoutes.js        # Routes autentikasi
│   ├── gameRoutes.js        # Routes permainan
│   ├── depositRoutes.js     # Routes deposit
│   └── adminRoutes.js       # Routes admin
├── middleware/
│   └── authMiddleware.js    # JWT & role verification
├── public/
│   ├── css/
│   │   ├── style.css        # Design system
│   │   └── roulette.css     # Roulette wheel styles
│   ├── js/
│   │   ├── auth.js          # Auth handler
│   │   ├── game.js          # Game logic
│   │   ├── deposit.js       # Deposit handler
│   │   └── admin.js         # Admin panel logic
│   ├── uploads/             # Folder bukti transfer
│   ├── index.html           # Landing & login page
│   ├── game.html            # Halaman permainan
│   ├── deposit.html         # Halaman deposit
│   └── admin.html           # Panel admin
├── server.js                # Entry point aplikasi
├── package.json             # Dependencies
└── .env                     # Environment variables
```

## 🎮 Cara Menggunakan

### Untuk Member:

1. **Registrasi** - Buat akun baru di halaman utama
2. **Deposit** - Klik tombol Deposit, transfer via GoPay, upload bukti
3. **Main** - Tunggu admin approve deposit, lalu mulai bermain roulette
4. **Taruhan** - Pilih tipe taruhan dan jumlah, klik "PUTAR ROULETTE"

### Untuk Admin:

1. **Login** dengan akun admin
2. **Verifikasi Deposit** - Tab pertama, lihat bukti transfer, approve/reject
3. **Manajemen User** - Edit saldo dan win rate individual per user
4. **Pengaturan** - Atur default win rate untuk semua user

## 🎯 Sistem Win Rate

Win rate menentukan persentase kesempatan menang member:

- **Default Win Rate:** Berlaku untuk semua user (contoh: 45%)
- **Custom Win Rate:** Bisa diset per user oleh admin
- **Implementasi:** Server otomatis generate hasil yang sesuai dengan win rate

Contoh: Win rate 45% berarti dari 100 putaran, user akan menang sekitar 45 kali.

## 🔧 Environment Variables

Salin `.env.example` ke `.env` dan sesuaikan:

```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
DB_PATH=./database.sqlite
GOPAY_NUMBER=0812-3456-7890
GOPAY_NAME=Admin Roulette
```

## 📊 API Endpoints

### Auth
- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile

### Game
- `POST /api/game/spin` - Putar roulette
- `GET /api/game/history` - Riwayat permainan
- `GET /api/game/balance` - Cek saldo

### Deposit
- `POST /api/deposit/request` - Submit permintaan deposit
- `GET /api/deposit/history` - Riwayat deposit
- `GET /api/deposit/status/:id` - Status deposit tertentu

### Admin
- `GET /api/admin/users` - List semua user
- `PUT /api/admin/users/:id` - Update user (saldo, win rate)
- `DELETE /api/admin/users/:id` - Hapus user
- `GET /api/admin/settings` - Get pengaturan game
- `PUT /api/admin/settings` - Update pengaturan
- `GET /api/admin/deposits` - List semua deposit
- `PUT /api/admin/deposits/:id/approve` - Approve deposit
- `PUT /api/admin/deposits/:id/reject` - Reject deposit
- `GET /api/admin/statistics` - Statistik dashboard

## ⚠️ Disclaimer

Aplikasi ini dibuat untuk tujuan **edukasi** dan **demonstrasi** teknis. Penggunaan untuk judi online mungkin melanggar hukum di beberapa yurisdiksi. Gunakan dengan bijak dan patuhi hukum setempat.

## 📝 License

ISC

---

**Dikembangkan dengan ❤️ menggunakan Node.js, Express, dan Sequelize**
