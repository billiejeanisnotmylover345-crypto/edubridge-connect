
-- Fix ALL RLS policies: change from RESTRICTIVE to PERMISSIVE
-- and add missing INSERT policy for user_roles

-- ===== user_roles =====
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== profiles =====
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Mentors can view assigned learner profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mentors can view assigned learner profiles" ON public.profiles FOR SELECT USING (
  has_role(auth.uid(), 'mentor'::app_role) AND EXISTS (
    SELECT 1 FROM mentor_assignments WHERE mentor_assignments.mentor_id = auth.uid() AND mentor_assignments.learner_id = profiles.user_id AND mentor_assignments.status = 'active'
  )
);

-- ===== mentor_assignments =====
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.mentor_assignments;
DROP POLICY IF EXISTS "Learners can view own assignment" ON public.mentor_assignments;
DROP POLICY IF EXISTS "Mentors can view own assignments" ON public.mentor_assignments;

CREATE POLICY "Learners can view own assignment" ON public.mentor_assignments FOR SELECT USING (auth.uid() = learner_id);
CREATE POLICY "Mentors can view own assignments" ON public.mentor_assignments FOR SELECT USING (auth.uid() = mentor_id);
CREATE POLICY "Admins can manage assignments" ON public.mentor_assignments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== waiting_list =====
DROP POLICY IF EXISTS "Admins can manage waiting list" ON public.waiting_list;
DROP POLICY IF EXISTS "Learners can view own waiting status" ON public.waiting_list;

CREATE POLICY "Learners can view own waiting status" ON public.waiting_list FOR SELECT USING (auth.uid() = learner_id);
CREATE POLICY "Learners can insert own waiting entry" ON public.waiting_list FOR INSERT WITH CHECK (auth.uid() = learner_id);
CREATE POLICY "Admins can manage waiting list" ON public.waiting_list FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== notifications =====
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'mentor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ===== questions =====
DROP POLICY IF EXISTS "Authenticated can view questions" ON public.questions;
DROP POLICY IF EXISTS "Learners can create questions" ON public.questions;
DROP POLICY IF EXISTS "Owner can update question" ON public.questions;

CREATE POLICY "Authenticated can view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Learners can create questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = asked_by);
CREATE POLICY "Owner can update question" ON public.questions FOR UPDATE USING (auth.uid() = asked_by);

-- ===== answers =====
DROP POLICY IF EXISTS "Authenticated can view answers" ON public.answers;
DROP POLICY IF EXISTS "Users can create answers" ON public.answers;

CREATE POLICY "Authenticated can view answers" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Users can create answers" ON public.answers FOR INSERT WITH CHECK (auth.uid() = answered_by);

-- ===== resources =====
DROP POLICY IF EXISTS "Authenticated users can view resources" ON public.resources;
DROP POLICY IF EXISTS "Mentors can create resources" ON public.resources;
DROP POLICY IF EXISTS "Creators can update own resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;

CREATE POLICY "Authenticated users can view resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Mentors can create resources" ON public.resources FOR INSERT WITH CHECK (has_role(auth.uid(), 'mentor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Creators can update own resources" ON public.resources FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = uploaded_by);

-- ===== sessions =====
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Mentors can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Mentors can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = learner_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mentors can create sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = mentor_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mentors can update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = mentor_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete sessions" ON public.sessions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
