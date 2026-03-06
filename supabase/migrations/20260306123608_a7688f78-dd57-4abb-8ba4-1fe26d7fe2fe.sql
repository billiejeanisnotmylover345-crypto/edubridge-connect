-- Drop the unique constraint on learner_id to allow multiple mentor assignments
ALTER TABLE public.mentor_assignments DROP CONSTRAINT IF EXISTS mentor_assignments_learner_id_key;