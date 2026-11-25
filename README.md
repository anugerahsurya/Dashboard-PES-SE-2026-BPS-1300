# Dashboard PES SE2026 Sumatera Barat

Dashboard React untuk Tim IT BPS Provinsi Sumatera Barat. Admin mengunggah empat CSV, memeriksa hasil impor, lalu menyimpan dengan kunci admin. Laporan dapat diunduh sebagai PNG.

## Menjalankan dan menerapkan dashboard

1. Terapkan migrasi dari `supabase/migrations` ke proyek Supabase PES.
2. Tambahkan variabel server `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, dan `PES_ADMIN_KEY` di proyek Vercel. `SUPABASE_SECRET_KEY` adalah secret API key dari proyek Supabase. Gunakan kunci acak panjang untuk `PES_ADMIN_KEY` dan bagikan hanya kepada admin. Gunakan variabel sensitif untuk kedua kunci.
3. Jalankan `npm ci` dan `vercel dev` untuk menguji UI dan API dengan variabel lingkungan Development yang sama. `npm run dev` menjalankan UI Vite saja. `npm run build` membuat build frontend.
4. Deploy proyek ke Vercel. Cek `/api/snapshots` untuk laporan terkini dan `/api/snapshots?date=2026-11-24` untuk laporan terakhir pada tanggal tersebut.

API Vercel menerima rekap agregat hasil pengolahan CSV. API memvalidasi kunci admin sebelum menulis ke Supabase. Tabel dan fungsi tulis hanya tersedia bagi peran server. Kunci Supabase tetap di server.

## Berkas harian

| Input | Ciri berkas |
| --- | --- |
| SLS | Kode wilayah, BELUM, SEDANG, dan SELESAI |
| PES SE2026 Non-UB | Ringkasan status assignment Non-UB |
| PES SE2026 UB | Ringkasan status assignment UB |
| Keterangan KP | Wilayah, status assignment dan TOTAL_ASSG_ADA_KP |

Dashboard mencocokkan kabupaten/kota berdasarkan kode wilayah. KP yang belum final dipindahkan dari status asal ke PPL, PML, dan olah final. KP yang sudah final dihitung sekali. EDITED dan COMPLETED BY Admin Kabupaten masuk PPL, PML, dan olah final. APPROVED juga masuk olah final.

## Riwayat laporan

Supabase menyimpan satu snapshot per pasangan tanggal dan jam pengambilan WIB. Unggah ulang pada jam yang sama memperbarui snapshot tersebut. Jam lain disimpan sebagai pengambilan tersendiri. Dashboard menampilkan pengambilan terakhir dan menghitung delta dengan pengambilan terakhir pada tanggal kalender H−1. Perbandingan tetap mengikuti tanggal H−1 meski ada beberapa unggahan hari ini.

Arsip yang dipindahkan berisi rekap 15 sampai 25 November 2026. Laporan bawaan masih tersedia sebagai cadangan dan acuan untuk tanggal awal. Dashboard menandai saat acuan H−1 tidak tersedia. Google Sheets dapat dibuka sebagai arsip laporan lama.
