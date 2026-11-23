# Dashboard-PES-SE-2026-BPS-1300

Dashboard React untuk Tim IT BPS Provinsi Sumatera Barat. Data awal berasal dari tiga CSV tanggal 14 November 2026. Admin memilih empat berkas ekspor harian, memeriksa tanggal dan jam laporan (WIB), lalu menyimpan rekap. Gunakan tombol unduh PNG untuk membagikan laporan ke grup.

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

Delta pada KPI, tabel usaha, dan PNG menampilkan selisih dua persentase dengan tanda %. Contoh: dari 30% ke 35% ditampilkan sebagai +5%. Untuk setiap kode wilayah dan tahap, aplikasi mengurangi persentase hari laporan dengan persentase tanggal kalender sebelumnya. Setiap hari menggunakan targetnya sendiri. Beberapa unggahan pada tanggal yang sama memperbarui laporan hari itu dengan acuan H−1 yang sama.

Aplikasi memakai riwayat Google Sheets, atau riwayat per tanggal di peramban dalam mode lokal. Laporan bawaan 13 November 2026 pukul 12.30 dan 14 November 2026 pukul 13.00 WIB tersedia sebagai acuan awal jika tanggal tersebut belum tersimpan. Jika data H−1 tidak tersedia, dashboard menandainya dan tidak menghitung delta.

## Membuat tab laporan di Google Sheets

1. Gunakan workbook **All About PES SE2026** yang sudah dikonversi menjadi Google Sheets. Akun yang menjalankan web app perlu akses **Editor** pada spreadsheet tujuan.
2. Tambahkan Script Property **REPORT_SPREADSHEET_ID** berisi ID spreadsheet laporan. Penyimpanan riwayat tetap menggunakan **SPREADSHEET_ID**. Tanpa properti tujuan, aplikasi hanya menyimpan snapshot. Jika template berganti nama, isi **REPORT_TEMPLATE_SHEET** dengan nama barunya. Nama bawaan adalah **14_11 14.00**.
3. Pasang versi terbaru **Code.gs** dan perbarui deployment web app. Integrasi memakai layanan bawaan SpreadsheetApp. Untuk menyalin snapshot terakhir yang sudah ada, jalankan fungsi **syncLatestReport** dari editor Apps Script.
4. Setelah unggahan berhasil, buka tab **PES YYYY-MM-DD HH.mm** pada spreadsheet tujuan. Nama memakai tanggal dan jam laporan WIB. Cek nama wilayah di A, tenggat di C, rekap di G sampai AI, serta tanggal laporan dan acuan progres di AK sampai AL. Kolom AM menyimpan jumlah UB berstatus *revoked*. Selisih zona waktu pengguna tidak mengubah tanggal laporan.
5. Cek baris provinsi terhadap dashboard. Dengan tiga CSV bawaan, G11 berisi 244, O11 berisi 37.470, Z11 berisi 250, dan AH11 berisi 49. Persentase memakai target masing-masing kategori. Nama petugas wilayah (Innas) dan format berasal dari template. Masalah dan tanda laporan administratif pada B, E, dan F dimulai kosong pada tab baru dan dapat diisi pengelola.
6. Pengiriman ulang dengan tanggal dan jam sama memperbarui tab yang dibuat aplikasi. Jam berbeda menghasilkan tab tersendiri. Jika nama tab telah dipakai untuk tab manual, ganti nama tab manual sebelum menyimpan. Template tetap dipertahankan. Jika respons gagal setelah tab terbit, kirim ulang data dengan tanggal dan jam yang sama untuk menyelesaikan penyimpanan riwayat.

## Ekspor mulai 19 November 2026

Status APPROVED BY Pengawas kini didukung. Total assignment mencakup seluruh status. Progres PPL mencakup semua status selain OPEN dan DRAFT. Progres PML mencakup COMPLETED, APPROVED, REJECTED dan REVOKED. Olah final adalah COMPLETED + APPROVED. Data lama yang belum memiliki approved menggunakan nilai nol.

Pasang Code.gs terbaru dan deploy versi baru sebelum mengunggah CSV dengan APPROVED. Tab laporan menyimpan hitungan APPROVED Non-UB dan UB pada AN dan AO. Laporan CSV 19 November 2026 pukul 16.37 WIB tersedia sebagai data bawaan. Dashboard menampilkan laporan dengan tanggal/jam terbaru antara data bawaan dan riwayat server, dan memberi keterangan jika data bawaan lebih baru. Unggah tiga CSV untuk menerbitkan snapshot ini ke riwayat Google Sheets.

Acuan H-1 memilih waktu pengambilan laporan paling akhir pada tanggal sebelumnya. Unggah mundur dengan jam lebih awal tetap membuat tab laporan, sementara snapshot harian memakai waktu pengambilan terbesar. Open ditampilkan sebagai jumlah assignment pada tabel web dan PNG.

## Unggah empat CSV dengan penyesuaian KP

Pilih SLS, Non-UB, UB ringkasan status (misalnya UB - 24 November 2026 Final.csv), dan rincian KP UB (misalnya UB - 24 November 2026.csv). CSV keempat hanya menyumbangkan Wilayah dan TOTAL_ASSG_ADA_KP. Kolom KP_DI_CATATAN yang lain tidak dijumlahkan karena dapat menghitung assignment yang sama lebih dari sekali.

Aplikasi mengurangi DRAFT UB sebanyak KP, menambah PPL/PML/final UB sebesar KP, dan mempertahankan COMPLETED asli serta total assignment. Field ub.kp mencatat penyesuaian sebagai status terpisah. Final UB = COMPLETED + APPROVED + KP. Draf pada snapshot sudah merupakan nilai setelah penyesuaian. Jika KP melebihi Draf atau ada wilayah hilang/duplikat, impor ditolak. Status historis tanpa kp tetap dihitung dengan kp = 0.

Pasang Code.gs terbaru lalu deploy New version sebelum menyimpan laporan empat CSV. Tab laporan menyimpan #KP UB pada AR dan Draf UB sebelum penyesuaian pada AS. Tanggal dan jam laporan diisi admin agar sesuai waktu pengambilan, lalu snapshot mengikuti aturan acuan H-1 yang sama.

## Status Admin Kabupaten

EDITED BY Admin Kabupaten masuk PPL dan PML, sedangkan COMPLETED BY Admin Kabupaten masuk PPL, PML, dan olah final. Final = COMPLETED Pengawas + COMPLETED Admin + APPROVED + KP (khusus UB). Kedua status admin disimpan terpisah agar jumlah assignment tetap dapat ditelusuri. Data historis yang belum memiliki kedua field menggunakan nol. Kolom AT:AW pada tab laporan menyimpan hitungan Edited dan Completed oleh Admin untuk Non-UB dan UB.

Perbarui Code.gs dan deploy New version sebelum menyimpan CSV dengan status admin tersebut.
