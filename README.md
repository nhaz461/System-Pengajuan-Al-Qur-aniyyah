# Sistem Administrasi Keuangan Yayasan Al-Qur'aniyyah

**Versi:** 1.0.0  
**Institusi:** Yayasan Pendidikan Islam Pondok Pesantren Al-Qur'aniyyah  
**Phase:** 1 — Setup & Master Data

---

## Cara Menjalankan

### 1. Install Dependencies (Pertama kali saja)

```powershell
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node src/seed.ts

# Frontend
cd ../frontend
npm install
```

### 2. Jalankan Aplikasi

**Cara cepat (gunakan script):**
```
Klik 2x file: start.bat
```

**Atau manual:**
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Akses Aplikasi

| Akses | URL |
|-------|-----|
| Frontend (local) | http://localhost:3000 |
| Frontend (LAN) | http://[IP-SERVER]:3000 |
| Backend API | http://localhost:5000/api |
| Health Check | http://localhost:5000/api/health |

### 4. Login Default

| Field | Value |
|-------|-------|
| Email | admin@alquraniyyah.sch.id |
| Password | Admin@2026 |

> ⚠️ **Ganti password setelah login pertama!**

---

## Struktur Direktori

```
PENGAJUAN & PENCAIRAN/
├── backend/          # Node.js + Express + Prisma
│   ├── prisma/       # Database schema & migrations
│   ├── src/          # Source code
│   └── .env          # Environment variables
├── frontend/         # React + TypeScript + Vite
│   └── src/          # Source code
├── database/         # SQLite database files
├── uploads/          # File uploads (Excel, bukti)
├── backups/          # Database backups
├── start.ps1         # PowerShell startup script
└── start.bat         # Windows batch startup script
```

---

## Role & Hak Akses

| Role | Akses |
|------|-------|
| **ADMIN** | Seluruh menu, master data, user management |
| **UNIT** | Upload pengajuan, realisasi unit sendiri |
| **KEUANGAN** | Review, matching SSH, pencairan |
| **PIMPINAN** | Persetujuan / penolakan pengajuan |

---

## Progress Pembangunan

| Phase | Status | Keterangan |
|-------|--------|-----------|
| Phase 1 | ✅ Selesai | Setup, Login, Master Unit, Kegiatan, Tahun Anggaran |
| Phase 2 | 🔲 Belum | Master SSH 2026, Import SSH |
| Phase 3 | 🔲 Belum | Import Excel Pengajuan, Preview |
| Phase 4 | 🔲 Belum | Review Keuangan, Matching SSH |
| Phase 5 | 🔲 Belum | Persetujuan Pimpinan |
| Phase 6 | 🔲 Belum | Pencairan |
| Phase 7 | 🔲 Belum | Realisasi & LPJ |
| Phase 8 | 🔲 Belum | Dashboard Lengkap |
| Phase 9 | 🔲 Belum | Audit, Backup, Restore, Final Testing |
