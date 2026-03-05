
-- Allow all authenticated users to see mentor roles (needed for mentor discovery)
CREATE POLICY "Authenticated can view mentor roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'mentor');
