
-- Assignments table: mentors create assignments for their learners
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
  submission_instructions TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Mentors can view their own assignments
CREATE POLICY "Mentors can view own assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id);

-- Learners can view assignments from their mentor
CREATE POLICY "Learners can view mentor assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_assignments ma
      WHERE ma.mentor_id = assignments.mentor_id
        AND ma.learner_id = auth.uid()
        AND ma.status = 'active'
    )
  );

-- Admins can manage all assignments
CREATE POLICY "Admins can manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Mentors can create assignments
CREATE POLICY "Mentors can create assignments" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id AND has_role(auth.uid(), 'mentor'));

-- Mentors can update own assignments
CREATE POLICY "Mentors can update own assignments" ON public.assignments
  FOR UPDATE TO authenticated
  USING (auth.uid() = mentor_id);

-- Mentors can delete own assignments
CREATE POLICY "Mentors can delete own assignments" ON public.assignments
  FOR DELETE TO authenticated
  USING (auth.uid() = mentor_id);

-- Assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL,
  content TEXT DEFAULT '',
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted',
  feedback TEXT,
  grade TEXT
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Learners can view own submissions
CREATE POLICY "Learners can view own submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = learner_id);

-- Mentors can view submissions for their assignments
CREATE POLICY "Mentors can view assignment submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.mentor_id = auth.uid()
    )
  );

-- Learners can create submissions
CREATE POLICY "Learners can submit assignments" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = learner_id);

-- Mentors can update submissions (for grading/feedback)
CREATE POLICY "Mentors can grade submissions" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.mentor_id = auth.uid()
    )
  );

-- Admins can manage all submissions
CREATE POLICY "Admins can manage submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Updated_at trigger for assignments
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
