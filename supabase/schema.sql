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
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  color TEXT DEFAULT '#22c55e',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Project followers receive notifications when new project events are added
CREATE TABLE IF NOT EXISTS public.project_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notify_new_events BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Event sign-ups let people subscribe to updates for one event
CREATE TABLE IF NOT EXISTS public.event_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  event_source TEXT NOT NULL CHECK (event_source IN ('project','community')),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attendee_name TEXT,
  attendee_email TEXT,
  attendee_avatar_url TEXT,
  notify_updates BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_source, event_id, user_id)
);

-- Event group chat messages. Anyone signed up to the event can post.
CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  event_source TEXT NOT NULL CHECK (event_source IN ('project','community')),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Area and event-type notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  area_label TEXT DEFAULT 'Māngere' NOT NULL,
  latitude DOUBLE PRECISION DEFAULT -37.0 NOT NULL,
  longitude DOUBLE PRECISION DEFAULT 174.8 NOT NULL,
  radius_km DOUBLE PRECISION DEFAULT 10 NOT NULL CHECK (radius_km > 0),
  event_types TEXT[] DEFAULT ARRAY['planting']::TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- In-app notification inbox populated by database triggers
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT DEFAULT 'new_event' NOT NULL CHECK (notification_type IN ('new_event','event_update')),
  title TEXT NOT NULL,
  body TEXT,
  event_id UUID,
  event_source TEXT CHECK (event_source IN ('project','community')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, event_source, event_id, notification_type)
);

-- Keep existing databases aligned with the current event map fields
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.event_signups ADD COLUMN IF NOT EXISTS attendee_name TEXT;
ALTER TABLE public.event_signups ADD COLUMN IF NOT EXISTS attendee_email TEXT;
ALTER TABLE public.event_signups ADD COLUMN IF NOT EXISTS attendee_avatar_url TEXT;

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
CREATE INDEX IF NOT EXISTS idx_project_followers_project_id ON public.project_followers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_followers_user_id ON public.project_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_event ON public.event_signups(event_source, event_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_user_id ON public.event_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_event_messages_event ON public.event_messages(event_source, event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_messages_user_id ON public.event_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id, read_at, created_at DESC);

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

CREATE OR REPLACE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
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

-- Store the user's public signup details at the moment they follow an event.
CREATE OR REPLACE FUNCTION public.populate_event_signup_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  user_row public.users%ROWTYPE;
BEGIN
  SELECT * INTO user_row FROM public.users WHERE id = NEW.user_id;

  NEW.attendee_name = COALESCE(NULLIF(NEW.attendee_name, ''), user_row.full_name);
  NEW.attendee_email = COALESCE(NULLIF(NEW.attendee_email, ''), user_row.email);
  NEW.attendee_avatar_url = COALESCE(NULLIF(NEW.attendee_avatar_url, ''), user_row.avatar_url);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER event_signups_populate_snapshot
  BEFORE INSERT OR UPDATE ON public.event_signups
  FOR EACH ROW EXECUTE FUNCTION public.populate_event_signup_snapshot();

CREATE OR REPLACE FUNCTION public.is_event_follower(source TEXT, target_event_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_signups es
    WHERE es.event_source = source
      AND es.event_id = target_event_id
      AND es.user_id = target_user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_event_organiser(source TEXT, target_event_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN source = 'project' THEN EXISTS (
      SELECT 1 FROM public.project_events pe
      WHERE pe.id = target_event_id AND pe.created_by = target_user_id
    )
    WHEN source = 'community' THEN EXISTS (
      SELECT 1 FROM public.community_events ce
      WHERE ce.id = target_event_id AND ce.created_by = target_user_id
    )
    ELSE FALSE
  END;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Distance helper for area-based notifications. Uses kilometres.
CREATE OR REPLACE FUNCTION public.distance_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
  SELECT 6371 * acos(
    LEAST(1, GREATEST(-1,
      sin(radians(lat1)) * sin(radians(lat2)) +
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2 - lon1))
    ))
  );
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION public.notify_project_event_subscribers()
RETURNS TRIGGER AS $$
DECLARE
  project_row public.projects%ROWTYPE;
BEGIN
  SELECT * INTO project_row FROM public.projects WHERE id = NEW.project_id;

  INSERT INTO public.user_notifications (
    user_id, notification_type, title, body, event_id, event_source, project_id
  )
  SELECT
    pf.user_id,
    'new_event',
    NEW.title,
    COALESCE(project_row.name, 'Project') || ' added a new ' || NEW.event_type || ' event.',
    NEW.id,
    'project',
    NEW.project_id
  FROM public.project_followers pf
  WHERE pf.project_id = NEW.project_id
    AND pf.notify_new_events = TRUE
    AND pf.user_id IS DISTINCT FROM NEW.created_by
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_notifications (
    user_id, notification_type, title, body, event_id, event_source, project_id
  )
  SELECT
    np.user_id,
    'new_event',
    NEW.title,
    COALESCE(project_row.name, 'Project') || ' has a new ' || NEW.event_type || ' event near ' || np.area_label || '.',
    NEW.id,
    'project',
    NEW.project_id
  FROM public.notification_preferences np
  WHERE np.enabled = TRUE
    AND (cardinality(np.event_types) = 0 OR NEW.event_type = ANY(np.event_types))
    AND public.distance_km(np.latitude, np.longitude, project_row.latitude, project_row.longitude) <= np.radius_km
    AND np.user_id IS DISTINCT FROM NEW.created_by
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_community_event_subscribers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (
    user_id, notification_type, title, body, event_id, event_source
  )
  SELECT
    np.user_id,
    'new_event',
    NEW.title,
    'New ' || NEW.event_type || ' event near ' || np.area_label || COALESCE(': ' || NEW.location, '.'),
    NEW.id,
    'community'
  FROM public.notification_preferences np
  WHERE np.enabled = TRUE
    AND (cardinality(np.event_types) = 0 OR NEW.event_type = ANY(np.event_types))
    AND public.distance_km(np.latitude, np.longitude, NEW.latitude, NEW.longitude) <= np.radius_km
    AND np.user_id IS DISTINCT FROM NEW.created_by
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_project_event_signups_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.title IS NOT DISTINCT FROM NEW.title
    AND OLD.description IS NOT DISTINCT FROM NEW.description
    AND OLD.start_date IS NOT DISTINCT FROM NEW.start_date
    AND OLD.end_date IS NOT DISTINCT FROM NEW.end_date
    AND OLD.all_day IS NOT DISTINCT FROM NEW.all_day
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (
    user_id, notification_type, title, body, event_id, event_source, project_id
  )
  SELECT
    es.user_id,
    'event_update',
    NEW.title,
    'An event you signed up for was updated.',
    NEW.id,
    'project',
    NEW.project_id
  FROM public.event_signups es
  WHERE es.event_source = 'project'
    AND es.event_id = NEW.id
    AND es.notify_updates = TRUE
    AND es.user_id IS DISTINCT FROM NEW.created_by
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_community_event_signups_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.title IS NOT DISTINCT FROM NEW.title
    AND OLD.description IS NOT DISTINCT FROM NEW.description
    AND OLD.location IS NOT DISTINCT FROM NEW.location
    AND OLD.start_date IS NOT DISTINCT FROM NEW.start_date
    AND OLD.end_date IS NOT DISTINCT FROM NEW.end_date
    AND OLD.all_day IS NOT DISTINCT FROM NEW.all_day
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (
    user_id, notification_type, title, body, event_id, event_source
  )
  SELECT
    es.user_id,
    'event_update',
    NEW.title,
    'An event you signed up for was updated.',
    NEW.id,
    'community'
  FROM public.event_signups es
  WHERE es.event_source = 'community'
    AND es.event_id = NEW.id
    AND es.notify_updates = TRUE
    AND es.user_id IS DISTINCT FROM NEW.created_by
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER project_event_insert_notifications
  AFTER INSERT ON public.project_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_event_subscribers();

CREATE OR REPLACE TRIGGER community_event_insert_notifications
  AFTER INSERT ON public.community_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_community_event_subscribers();

CREATE OR REPLACE TRIGGER project_event_update_notifications
  AFTER UPDATE ON public.project_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_event_signups_on_update();

CREATE OR REPLACE TRIGGER community_event_update_notifications
  AFTER UPDATE ON public.community_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_community_event_signups_on_update();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
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

-- Project followers
CREATE POLICY "ProjectFollowers: public read" ON public.project_followers FOR SELECT USING (true);
CREATE POLICY "ProjectFollowers: own insert" ON public.project_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ProjectFollowers: own update" ON public.project_followers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ProjectFollowers: own delete" ON public.project_followers FOR DELETE USING (auth.uid() = user_id);

-- Event sign-ups
CREATE POLICY "EventSignups: public read" ON public.event_signups FOR SELECT USING (true);
CREATE POLICY "EventSignups: own insert" ON public.event_signups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "EventSignups: own update" ON public.event_signups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "EventSignups: own delete" ON public.event_signups FOR DELETE USING (auth.uid() = user_id);

-- Event messages
CREATE POLICY "EventMessages: follower or organiser read" ON public.event_messages
  FOR SELECT USING (
    public.is_event_follower(event_source, event_id, auth.uid())
    OR public.is_event_organiser(event_source, event_id, auth.uid())
  );
CREATE POLICY "EventMessages: follower insert" ON public.event_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_event_follower(event_source, event_id, auth.uid())
  );

-- Notification preferences
CREATE POLICY "NotificationPreferences: own read" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "NotificationPreferences: own insert" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "NotificationPreferences: own update" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "NotificationPreferences: own delete" ON public.notification_preferences FOR DELETE USING (auth.uid() = user_id);

-- User notifications
CREATE POLICY "UserNotifications: own read" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "UserNotifications: own update" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "UserNotifications: own delete" ON public.user_notifications FOR DELETE USING (auth.uid() = user_id);

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
  FOREACH tbl IN ARRAY ARRAY['projects','project_images','project_events','community_events','project_followers','event_signups','event_messages','notification_preferences','user_notifications','statistics']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
