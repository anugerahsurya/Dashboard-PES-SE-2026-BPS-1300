# Dashboard PES SE2026 Sumatera Barat

Dashboard React untuk Tim IT BPS Provinsi Sumatera Barat. Admin memeriksa hasil impor CSV dan menyimpannya dengan kunci admin. Laporan progres dapat diunduh sebagai PNG.

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
| CSV gabungan #KP dan eksplorasi | Ekspor SQL Lab dengan Kab/Kot, status KK, Usaha (Bang=1), Usaha (Nama KK), UB Total Assignment, UB Ada #KP, UB Belum Entri Root, dan UB #KP per Status |

Dashboard mencocokkan kabupaten/kota berdasarkan kode wilayah. KP yang belum final dipindahkan dari status asal ke PPL, PML, dan olah final. KP yang sudah final dihitung sekali. EDITED dan COMPLETED BY Admin Kabupaten masuk PPL, PML, dan olah final. APPROVED juga masuk olah final.

Selama olah final masih berjalan, formulir menampilkan empat input. Setelah UB dan Non-UB mencapai 100% di setiap kabupaten/kota peserta, formulir hanya meminta CSV gabungan. Unggahan berikutnya memperbarui eksplorasi dan #KP dengan tanggal baru. Panel progres, delta H−1, dan unduhan PNG memakai pengambilan progres final.

Tab Keluarga menampilkan komposisi dan kelompok pemutakhiran provinsi. Tab Usaha keluarga menyediakan pilihan sumber Nama KK dan Bang=1. Indikator UB ditampilkan sebagai proporsi dari total assignment. Kolom aktif tampil bila tersedia di CSV.

## Riwayat laporan

Supabase menyimpan satu snapshot per pasangan tanggal dan jam pengambilan WIB. Unggah ulang pada jam yang sama memperbarui snapshot tersebut. Jam lain disimpan sebagai pengambilan tersendiri. Dashboard menampilkan pengambilan terakhir dan menghitung delta dengan pengambilan terakhir pada tanggal kalender H−1. Perbandingan tetap mengikuti tanggal H−1 meski ada beberapa unggahan hari ini.

Arsip yang dipindahkan berisi rekap 15 sampai 25 November 2026. Laporan bawaan masih tersedia sebagai cadangan dan acuan untuk tanggal awal. Dashboard menandai saat acuan H−1 tidak tersedia. Google Sheets dapat dibuka sebagai arsip laporan lama.
