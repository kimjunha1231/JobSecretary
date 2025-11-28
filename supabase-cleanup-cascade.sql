-- 1. Drop existing foreign key constraints
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_user_id_fkey;

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- 2. Re-add foreign key constraints with ON DELETE CASCADE
ALTER TABLE public.documents
ADD CONSTRAINT documents_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Create or replace the delete_user_account function
-- This function is now simplified because CASCADE handles the data deletion.
-- However, we keep it for explicit cleanup if needed or for other logic.
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Data in 'documents' and 'user_profiles' will be automatically deleted
  -- due to the ON DELETE CASCADE constraint when the user is deleted from auth.users.
  
  -- If you have other tables without CASCADE, delete them here.
  -- For example:
  -- DELETE FROM public.other_table WHERE user_id = user_id_to_delete;
  
  -- We can explicitly delete here just to be sure, but it's redundant with CASCADE.
  DELETE FROM public.documents WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_profiles WHERE user_id = user_id_to_delete;
END;
$$;
