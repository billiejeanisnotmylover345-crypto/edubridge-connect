
-- Allow learners to view mentor profiles (users with mentor role)
CREATE POLICY "Learners can view mentor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.user_id
    AND user_roles.role = 'mentor'
  )
);

-- Allow learners to insert their own mentor assignment
CREATE POLICY "Learners can create own assignment"
ON public.mentor_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = learner_id);

-- Allow learners to view all mentor assignments (to see mentor student counts)
CREATE POLICY "Authenticated can view assignment counts"
ON public.mentor_assignments
FOR SELECT
TO authenticated
USING (true);
