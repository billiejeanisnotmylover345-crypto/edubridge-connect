
DROP POLICY "Authenticated can insert email logs" ON public.email_logs;
CREATE POLICY "Authenticated can insert email logs"
  ON public.email_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
