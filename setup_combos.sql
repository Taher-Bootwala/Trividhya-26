-- Create the Combos table
CREATE TABLE IF NOT EXISTS public.combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    min_members INTEGER DEFAULT 1,
    max_members INTEGER DEFAULT 1,
    events_data JSONB NOT NULL,
    total_fee INTEGER DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add amount column to registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS amount INTEGER;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS combo_id UUID REFERENCES public.combos(id);

-- If RLS is enabled, create policies to allow read/write access
CREATE POLICY "Allow all access to combos" ON public.combos FOR ALL USING (true) WITH CHECK (true);
