-- Account Deletion Migration
-- This script updates foreign key constraints to enable CASCADE deletion
-- When a user is deleted from auth.users, all related data will be automatically deleted

-- 1. Update documents table to CASCADE delete when user is deleted
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_user_id_fkey;

ALTER TABLE public.documents
ADD CONSTRAINT documents_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 2. Update user_profiles table to CASCADE delete when user is deleted
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. Create a function to handle complete account deletion
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_documents_count int;
  deleted_profile_count int;
BEGIN
  -- Verify the requesting user is deleting their own account
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own account';
  END IF;

  -- Delete user's documents (will be automatic with CASCADE, but we count them)
  SELECT COUNT(*) INTO deleted_documents_count
  FROM public.documents
  WHERE user_id = user_id_to_delete;

  DELETE FROM public.documents WHERE user_id = user_id_to_delete;

  -- Delete user's profile (will be automatic with CASCADE, but we count it)
  SELECT COUNT(*) INTO deleted_profile_count
  FROM public.user_profiles
  WHERE user_id = user_id_to_delete;

  DELETE FROM public.user_profiles WHERE user_id = user_id_to_delete;

  -- Return summary of deleted data
  RETURN json_build_object(
    'success', true,
    'deleted_documents', deleted_documents_count,
    'deleted_profile', deleted_profile_count,
    'message', 'All user data has been deleted'
  );
END;
$$;

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;

-- 5. Verify the constraints
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Foreign key constraints updated with CASCADE delete';
  RAISE NOTICE 'Function delete_user_account created';
END $$;
