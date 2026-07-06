-- Store follower signup details and add per-event group chat.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.event_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  event_source TEXT NOT NULL CHECK (event_source IN ('project','community')),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notify_updates BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_source, event_id, user_id)
);

ALTER TABLE public.event_signups ADD COLUMN IF NOT EXISTS attendee_name TEXT;
ALTER TABLE public.event_signups ADD COLUMN IF NOT EXISTS attendee_email TEXT;
ALTER TABLE public.event_signups ADD COLUMN IF NOT EXISTS attendee_avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  event_source TEXT NOT NULL CHECK (event_source IN ('project','community')),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_messages_event ON public.event_messages(event_source, event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_messages_user_id ON public.event_messages(user_id);

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

DROP TRIGGER IF EXISTS event_signups_populate_snapshot ON public.event_signups;
CREATE TRIGGER event_signups_populate_snapshot
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

ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "EventMessages: follower or organiser read" ON public.event_messages;
CREATE POLICY "EventMessages: follower or organiser read" ON public.event_messages
  FOR SELECT USING (
    public.is_event_follower(event_source, event_id, auth.uid())
    OR public.is_event_organiser(event_source, event_id, auth.uid())
  );

DROP POLICY IF EXISTS "EventMessages: follower insert" ON public.event_messages;
CREATE POLICY "EventMessages: follower insert" ON public.event_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_event_follower(event_source, event_id, auth.uid())
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'event_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages;
  END IF;
END $$;
