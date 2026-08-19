# Halaman Pengalihan (Redirect) ke PERMINTAAN V2

Halaman landing page dan redirect otomatis modern untuk mengarahkan pengguna dari repositori lama ke link baru:  
👉 **https://jabargroup.github.io/PERMINTAANV2/**

---

## 📁 Berkas dalam Folder Ini

1. **`index.html`** : File utama yang berisi tampilan fullscreen modern, animasi background, visual status migrasi, timer hitung mundur 5 detik, tombol salin link, dan tombol langsung beralih ke link baru.
2. **`hero-illustration.jpg`** : Gambar 3D ilustrasi peluncuran/migrasi sistem (otomatis fallback ke ikon animasi roket jika file gambar tidak disertakan).

---

## 🚀 Cara Upload ke GitHub

### Opsi 1: Lewat Web GitHub (Paling Mudah & Cepat)
1. Buka repositori GitHub lama Anda (misal `https://github.com/jabargroup/PERMINTAAN` atau nama repo lama).
2. Di halaman utama repo, klik tombol **`Add file`** ➡️ **`Upload files`**.
3. Drag & drop (seret) file **`index.html`** dan **`hero-illustration.jpg`** ke browser.
4. Tulis pesan commit di bawah (contoh: `Update redirect to PERMINTAANV2`).
5. Klik **`Commit changes`**.
6. Selesai! Jika GitHub Pages aktif di branch tersebut, halaman redirect akan langsung aktif.

---

### Opsi 2: Lewat Git Terminal / Command Prompt
```bash
# Masuk ke folder repo lama Anda
cd path/ke/folder-repo-lama

# Salin file index.html dan hero-illustration.jpg ke folder repo
# Kemudian jalankan:
git add index.html hero-illustration.jpg
git commit -m "feat: redirect to PERMINTAANV2"
git push origin main
```

---

## ✨ Fitur Unggulan Halaman Ini
- **Otomatis Redirect**: Mengarahkan pengunjung dalam 5 detik dengan animasi progress bar.
- **Tombol Navigasi Instan**: Pengguna bisa langsung klik tombol "Buka Sistem Permintaan V2 Sekarang".
- **Fitur Salin Link**: Tombol copy link dengan notifikasi toast.
- **Tombol Jeda Timer**: Pengguna bisa menjeda hitung mundur jika ingin membaca info terlebih dahulu.
- **Tampilan Fullscreen Responsif**: Tampilan tetap bagus dan rapi di HP, tablet, maupun layar desktop/komputer.
- **SEO & Meta Tag Lengkap**: Termasuk meta refresh fallback dan open-graph untuk share link di WhatsApp/Telegram.
