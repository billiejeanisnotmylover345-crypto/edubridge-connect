
CREATE OR REPLACE FUNCTION public.validate_submission_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (SELECT deadline_at FROM public.assignments WHERE id = NEW.assignment_id) < now() THEN
    RAISE EXCEPTION 'The deadline for this assignment has passed. Submissions are no longer accepted.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_submission_deadline
  BEFORE INSERT ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_submission_deadline();
