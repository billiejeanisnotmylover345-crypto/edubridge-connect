
-- Milestones table for progress tracking
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can view own milestones" ON public.milestones FOR SELECT USING (auth.uid() = learner_id);
CREATE POLICY "Mentors can view own milestones" ON public.milestones FOR SELECT USING (auth.uid() = mentor_id);
CREATE POLICY "Admins can manage milestones" ON public.milestones FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Mentors can create milestones" ON public.milestones FOR INSERT WITH CHECK (auth.uid() = mentor_id);
CREATE POLICY "Mentors can update own milestones" ON public.milestones FOR UPDATE USING (auth.uid() = mentor_id);
CREATE POLICY "Mentors can delete own milestones" ON public.milestones FOR DELETE USING (auth.uid() = mentor_id);

-- Messages table for real-time chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can update read status" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Session ratings table
CREATE TABLE public.session_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, learner_id)
);

ALTER TABLE public.session_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings" ON public.session_ratings FOR SELECT USING (true);
CREATE POLICY "Learners can create ratings" ON public.session_ratings FOR INSERT WITH CHECK (auth.uid() = learner_id);
CREATE POLICY "Learners can update own ratings" ON public.session_ratings FOR UPDATE USING (auth.uid() = learner_id);
