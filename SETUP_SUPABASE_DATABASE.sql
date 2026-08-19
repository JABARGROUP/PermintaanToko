-- ==============================================================================
-- SKRIP SETUP DATABASE SUPABASE (APLIKASI PERMINTAAN TOKO)
-- ==============================================================================
-- Jalankan skrip ini di SUPABASE Dashboard -> Menu "SQL Editor" -> "New Query" -> Klik "Run"
-- ==============================================================================

-- 1. TABEL: USERS (PENGGUNA & LOGIN)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '1',
    full_name TEXT NOT NULL,
    store_code TEXT DEFAULT '',
    phone TEXT DEFAULT '-',
    category TEXT NOT NULL DEFAULT 'TOKO',
    area TEXT NOT NULL DEFAULT 'BDG',
    ttd TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL: TOKO_LIST (DAFTAR TOKO RESMI)
CREATE TABLE IF NOT EXISTS public.toko_list (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    store_code TEXT DEFAULT '',
    area TEXT NOT NULL DEFAULT 'BDG',
    created_by TEXT DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: PERMINTAAN_TOKO (SURAT PERMINTAAN & PART)
CREATE TABLE IF NOT EXISTS public.permintaan_toko (
    id TEXT PRIMARY KEY,
    no_surat TEXT UNIQUE,
    toko TEXT,
    user_id TEXT,
    tanggal TEXT,
    area TEXT DEFAULT 'BDG',
    status TEXT DEFAULT 'MENUNGGU',
    status_persetujuan TEXT DEFAULT 'MENUNGGU',
    disetujui_oleh TEXT DEFAULT '',
    keterangan_penolakan TEXT DEFAULT '',
    items JSONB DEFAULT '[]'::jsonb,
    items_part JSONB DEFAULT '[]'::jsonb,
    ttd_pemohon TEXT DEFAULT '',
    ttd_pemberi TEXT DEFAULT '',
    catatan TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL: LOOKUP (PENGATURAN GLOBAL, FONTE WA, TEMA, DLL)
CREATE TABLE IF NOT EXISTS public.lookup (
    key TEXT PRIMARY KEY,
    value JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. MATIKAN / ATUR ROW LEVEL SECURITY (RLS) AGAR APLIKASI BISA BACA & TULIS
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toko_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permintaan_toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup ENABLE ROW LEVEL SECURITY;

-- Buat Policy Akses Penuh untuk anon & authenticated key
DROP POLICY IF EXISTS "Public full access users" ON public.users;
CREATE POLICY "Public full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access toko_list" ON public.toko_list;
CREATE POLICY "Public full access toko_list" ON public.toko_list FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access permintaan_toko" ON public.permintaan_toko;
CREATE POLICY "Public full access permintaan_toko" ON public.permintaan_toko FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access lookup" ON public.lookup;
CREATE POLICY "Public full access lookup" ON public.lookup FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. AKTIFKAN REALTIME UNTUK SEMUA TABEL
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'permintaan_toko'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.permintaan_toko;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'toko_list'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.toko_list;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'lookup'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lookup;
    END IF;
END $$;

-- ==============================================================================
-- 7. STORAGE BUCKET: BIKIN BUCKET 'photos' UNTUK FOTO BUKTI
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy Akses Storage Photos
DROP POLICY IF EXISTS "Public Access Photos" ON storage.objects;
CREATE POLICY "Public Access Photos" ON storage.objects FOR ALL USING (bucket_id = 'photos') WITH CHECK (bucket_id = 'photos');

-- ==============================================================================
-- 8. SEED DATA PENGGUNA AWAL (ADMIN & USER DEFAULT)
-- ==============================================================================
INSERT INTO public.users (id, username, password, full_name, category, area)
VALUES 
    ('ADMIN', 'ADMIN', '1', 'SUPER ADMIN', 'ADMIN', 'ALL'),
    ('TSM', 'TSM', '1', 'SERVICE TSM', 'SERVICE', 'ALL'),
    ('DM', 'DM', '1', 'DISTRICT MANAGER', 'DM', 'ALL'),
    ('GBJ', 'GBJ', '1', 'GUDANG BARANG JADI', 'GBJ', 'ALL'),
    ('SALES', 'SALES', '1', 'TIM SALES', 'SALES', 'ALL')
ON CONFLICT (username) DO NOTHING;

-- SELESAI! DATABASE SUPABASE SIAP DIGUNAKAN 100%.
