-- Allow learners to update their own assignments (for switching mentors)
CREATE POLICY "Learners can update own assignment"
ON public.mentor_assignments
FOR UPDATE
TO authenticated
USING (auth.uid() = learner_id)
WITH CHECK (auth.uid() = learner_id);