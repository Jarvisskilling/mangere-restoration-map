-- ============================================================
-- Māngere Restoration Map – Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users (mirrors auth.users with extra profile data)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Projects (map locations)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'New Restoration Site',
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  trees_planted INTEGER DEFAULT 0 NOT NULL,
  area_sqm DOUBLE PRECISION DEFAULT 0 NOT NULL,
  contributor_count INTEGER DEFAULT 0 NOT NULL,
  project_type TEXT DEFAULT 'restoration' NOT NULL
    CHECK (project_type IN ('restoration','planting','cleanup','monitoring','education')),
  status TEXT DEFAULT 'active' NOT NULL
    CHECK (status IN ('active','completed','planned')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Project images
CREATE TABLE IF NOT EXISTS public.project_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Project stories / notes
CREATE TABLE IF NOT EXISTS public.project_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT DEFAULT '' NOT NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Project-specific calendar events
CREATE TABLE IF NOT EXISTS public.project_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE NOT NULL,
  event_type TEXT DEFAULT 'other' NOT NULL
    CHECK (event_type IN ('planting','cleanup','meetup','gathering','monitoring','other')),
  color TEXT DEFAULT '#22c55e',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Global community calendar events
CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE NOT NULL,
  event_type TEXT DEFAULT 'other' NOT NULL
    CHECK (event_type IN ('planting','cleanup','meetup','gathering','monitoring','other')),
  location TEXT,
  color TEXT DEFAULT '#22c55e',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Global statistics (single row, updated via triggers)
CREATE TABLE IF NOT EXISTS public.statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_trees_planted BIGINT DEFAULT 0 NOT NULL,
  total_volunteers INTEGER DEFAULT 0 NOT NULL,
  total_area_sqm DOUBLE PRECISION DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed the single statistics row
INSERT INTO public.statistics (total_trees_planted, total_volunteers, total_area_sqm)
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON public.project_images(project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_project_id ON public.project_events(project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_start_date ON public.project_events(start_date);
CREATE INDEX IF NOT EXISTS idx_community_events_start_date ON public.community_events(start_date);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update project updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Recompute global statistics when projects change
CREATE OR REPLACE FUNCTION public.refresh_statistics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.statistics SET
    total_trees_planted = (SELECT COALESCE(SUM(trees_planted), 0) FROM public.projects),
    total_volunteers    = (SELECT COALESCE(SUM(contributor_count), 0) FROM public.projects),
    total_area_sqm      = (SELECT COALESCE(SUM(area_sqm), 0) FROM public.projects),
    updated_at          = NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER projects_stats_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_statistics();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users: public read"   ON public.users FOR SELECT USING (true);
CREATE POLICY "Users: own insert"    ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users: own update"    ON public.users FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY "Projects: public read"    ON public.projects FOR SELECT USING (true);
CREATE POLICY "Projects: auth insert"    ON public.projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Projects: creator update" ON public.projects FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Projects: creator delete" ON public.projects FOR DELETE USING (auth.uid() = created_by);

-- Project images
CREATE POLICY "ProjectImages: public read"    ON public.project_images FOR SELECT USING (true);
CREATE POLICY "ProjectImages: auth insert"    ON public.project_images FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ProjectImages: uploader delete" ON public.project_images FOR DELETE USING (auth.uid() = uploaded_by);

-- Project stories
CREATE POLICY "Stories: public read"  ON public.project_stories FOR SELECT USING (true);
CREATE POLICY "Stories: auth upsert"  ON public.project_stories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Stories: auth update"  ON public.project_stories FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Project events
CREATE POLICY "ProjectEvents: public read"    ON public.project_events FOR SELECT USING (true);
CREATE POLICY "ProjectEvents: auth insert"    ON public.project_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ProjectEvents: creator update" ON public.project_events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "ProjectEvents: creator delete" ON public.project_events FOR DELETE USING (auth.uid() = created_by);

-- Community events
CREATE POLICY "CommunityEvents: public read"    ON public.community_events FOR SELECT USING (true);
CREATE POLICY "CommunityEvents: auth insert"    ON public.community_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "CommunityEvents: creator update" ON public.community_events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "CommunityEvents: creator delete" ON public.community_events FOR DELETE USING (auth.uid() = created_by);

-- Statistics
CREATE POLICY "Statistics: public read" ON public.statistics FOR SELECT USING (true);

-- ============================================================
-- STORAGE BUCKETS
-- Run these in Supabase Dashboard > Storage
-- or via the Storage API
-- ============================================================

-- Create project-images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT DO NOTHING;

-- Storage RLS
CREATE POLICY "Storage: public read project-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

CREATE POLICY "Storage: auth upload project-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Storage: uploader delete project-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME (safely add tables, skip if already a member)
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects','project_images','project_events','community_events','statistics']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
