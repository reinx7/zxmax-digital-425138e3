/*
  # Fix first user admin promotion

  This migration adds a policy that allows the first user to insert themselves as admin
  when no admins exist in the system.

  1. Security Updates
    - Drop existing restrictive policy for role insertion
    - Create new policy that allows first admin creation
*/

-- Drop the existing restrictive admin-only policy for inserting roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create a policy that allows:
-- 1. Admins to manage all roles
-- 2. ANY authenticated user to insert admin role IF no admins exist yet
CREATE POLICY "Allow first admin or existing admins to manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    -- Can read/update/delete if user is admin OR it's their own role
    public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()
  )
  WITH CHECK (
    -- Can insert if:
    -- 1. User is already admin, OR
    -- 2. No admins exist in the system (first admin creation)
    public.has_role(auth.uid(), 'admin') 
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  );

-- Also create a specific INSERT policy for clarity
DROP POLICY IF EXISTS "First user can become admin" ON public.user_roles;
CREATE POLICY "First user can become admin"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is admin OR no admins exist
    public.has_role(auth.uid(), 'admin')
    OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  );

-- Ensure the user_roles table allows authenticated users to read their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
