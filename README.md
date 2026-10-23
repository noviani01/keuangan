# Ruang Kas

Aplikasi manajemen keuangan pribadi untuk mencatat pemasukan, pengeluaran, dan melihat ringkasan arus kas. Frontend menggunakan React + Vite, autentikasi dan database menggunakan Supabase, dan siap di-deploy ke Vercel.

## Menjalankan lokal

1. Pasang dependency dengan `npm install`.
2. Salin `.env.example` menjadi `.env`, lalu isi kredensial project Supabase.
3. Jalankan isi `supabase/schema.sql` di SQL Editor Supabase.
4. Jalankan `npm run dev`.

Tanpa kredensial Supabase, dashboard akan menampilkan data contoh. Login dan penyimpanan permanen baru aktif setelah Supabase dikonfigurasi.

## Supabase

Buat project di Supabase, lalu ambil Project URL dan anon/public key dari pengaturan API project. Isi keduanya sebagai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di `.env`. Jalankan SQL pada `supabase/schema.sql` untuk membuat tabel transaksi, indeks, dan kebijakan Row Level Security. Kebijakan membatasi baca/tulis/hapus ke transaksi milik pengguna yang sedang login.

Untuk produksi, atur URL situs dan URL redirect autentikasi di **Authentication > URL Configuration** pada Supabase. Tambahkan URL Vercel produksi dan URL preview yang dibutuhkan.

## Deploy Vercel

1. Impor repository ini ke Vercel.
2. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di **Project Settings > Environment Variables** untuk environment yang digunakan.
3. Deploy. Vercel mendeteksi Vite secara otomatis; `vercel.json` menangani route fallback.

Setiap environment variable yang diawali `VITE_` tersedia pada bundle browser. Gunakan hanya anon/public key Supabase di frontend; jangan pernah masukkan `service_role` key.