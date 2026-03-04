
-- ===== RESOURCES =====
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_url TEXT,
  video_url TEXT,
  resource_type TEXT NOT NULL DEFAULT 'document',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view resources" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mentors can create resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'mentor') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators can update own resources" ON public.resources FOR UPDATE TO authenticated USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR auth.uid() = uploaded_by);

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== SESSIONS =====
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT TO authenticated USING (auth.uid() = mentor_id OR auth.uid() = learner_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors can create sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors can update own sessions" ON public.sessions FOR UPDATE TO authenticated USING (auth.uid() = mentor_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== QUESTIONS =====
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asked_by UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view questions" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Learners can create questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = asked_by);
CREATE POLICY "Owner can update question" ON public.questions FOR UPDATE TO authenticated USING (auth.uid() = asked_by);

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== ANSWERS =====
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answered_by UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view answers" ON public.answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create answers" ON public.answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = answered_by);

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ===== STORAGE BUCKET FOR RESOURCES =====
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

CREATE POLICY "Authenticated can upload resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources');
CREATE POLICY "Anyone can view resource files" ON storage.objects FOR SELECT USING (bucket_id = 'resources');
CREATE POLICY "Owners can delete resource files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resources');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
