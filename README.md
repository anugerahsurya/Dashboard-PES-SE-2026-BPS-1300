# Dashboard progres PES SE2026 Sumatera Barat

Dashboard React untuk Tim IT BPS Provinsi Sumatera Barat. Data awal berasal dari tiga CSV tanggal 14 November 2026. Admin memilih tiga berkas ekspor harian, memeriksa tanggal dan jam laporan (WIB), lalu menyimpan rekap. Gunakan tombol unduh PNG untuk membagikan laporan ke grup.

## Menjalankan situs

Dari folder `dashboard`, jalankan perintah berikut dengan Node.js dan npm terpasang.

```sh
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite. Tanpa URL Apps Script, perubahan tersimpan di peramban yang digunakan. Untuk berbagi data antarpengguna, hubungkan Apps Script melalui langkah berikut.

## Menyiapkan penyimpanan bersama

1. Buat Google Spreadsheet kosong menggunakan akun pengelola. Salin ID spreadsheet, yaitu bagian URL di antara `/d/` dan `/edit`.
2. Di spreadsheet, buka **Extensions → Apps Script**. Salin isi `Code.gs` dari proyek ini ke editor, lalu simpan.
3. Di **Project Settings → Script properties**, tambahkan `SPREADSHEET_ID` berisi ID spreadsheet dan `ADMIN_KEY` berisi kata sandi acak yang panjang dari pengelola kata sandi. Bagikan kunci ini hanya ke admin pengunggah. [Panduan Script Properties](https://developers.google.com/apps-script/guides/properties)
4. Di editor, pilih fungsi **setup** lalu klik **Run** dan berikan izin akses spreadsheet. Fungsi ini menyiapkan lembar **Snapshot PES**.
5. Pilih **Deploy → New deployment → Web app**. Untuk dashboard yang dapat dibaca tanpa login, pilih **Execute as me** dan akses **Anyone**. Siapa pun yang memiliki URL dapat membaca rekap agregat. Penulisan tetap memerlukan kunci admin. Jika kebijakan akun Workspace membatasi akses anonim, koordinasikan deployment dengan pengelola domain. Salin URL web app yang berakhir dengan `/exec`. [Panduan deployment Google](https://developers.google.com/apps-script/guides/web)
6. Buat file `.env.local` di folder `dashboard` dengan isi berikut dan ganti ID deployment. Kunci admin cukup dimasukkan saat menyimpan melalui situs. Nilai variabel berawalan `VITE_` akan terlihat publik dalam hasil build.

   ```dotenv
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/ID_DEPLOYMENT/exec
   ```

7. Jalankan kembali server pengembangan atau jalankan `npm run build` lalu unggah **isi folder dist** ke hosting statis. Jika URL Apps Script berubah, perbarui variabel dan build ulang situs.
8. Buka URL `/exec` dari peramban sebelum mengunggah laporan pertama. Respons awal berupa `{"ok":true,"snapshot":null}`. Simpan satu laporan dari situs, lalu buka situs dari peramban lain untuk memeriksa data bersama.

## Berkas harian

| Input | Ciri berkas |
| --- | --- |
| SLS | Kolom kode wilayah serta status BELUM, SEDANG, dan SELESAI |
| PES SE2026 (Non-UB) | Ekspor penugasan pencacahan Non-UB |
| PES SE2026 UB | Ekspor penugasan pencacahan UB |

Kedua ekspor penugasan dapat memakai nama `progress-assignment-…csv`. Pilih berkas sesuai kegiatan asalnya. Aplikasi mencocokkan kode kabupaten/kota dan nama kolom sebelum menghitung rekap.

## Riwayat dan pemeliharaan

Lembar **Snapshot PES** menyimpan satu baris per tanggal laporan. Unggah ulang pada tanggal yang sama memperbarui baris tersebut. Tanggal laporan terbesar menjadi laporan terkini, sehingga koreksi mundur pada tanggal sebelumnya tetap masuk ke riwayat. Untuk membaca rekap tanggal tertentu, buka URL web app dengan parameter seperti `?date=2026-11-14`. Kolom waktu simpan memakai UTC, sedangkan tanggal dan jam dashboard mengikuti input WIB.

Admin dapat merotasi `ADMIN_KEY` melalui Script properties. Untuk menerapkan perubahan kode backend, simpan kode di editor lalu pilih **Deploy → Manage deployments → Edit → New version → Deploy**. [Panduan versi deployment](https://developers.google.com/apps-script/concepts/deployments)

## Perubahan harian

Delta pada KPI, tabel usaha, dan PNG memakai satuan poin persentase (pp). Untuk setiap kode wilayah dan tahap, aplikasi mengurangi persentase hari laporan dengan persentase tanggal kalender sebelumnya. Setiap hari menggunakan targetnya sendiri. Beberapa unggahan pada tanggal yang sama memperbarui laporan hari itu dengan acuan H−1 yang sama.

Aplikasi memakai riwayat Google Sheets, atau riwayat per tanggal di peramban dalam mode lokal. Laporan bawaan 13 November 2026 pukul 12.30 dan 14 November 2026 pukul 13.00 WIB tersedia sebagai acuan awal jika tanggal tersebut belum tersimpan. Jika data H−1 tidak tersedia, dashboard menandainya dan tidak menghitung delta.
