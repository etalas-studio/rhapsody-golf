-- Storage policies for club-images bucket.
-- Bucket must already exist (created manually in Supabase dashboard).
-- Uses public.current_user_role() consistent with other RLS policies in this project.

-- Public read — golfers can see club photos without auth.
CREATE POLICY "club_images: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'club-images');

-- club_admin may only upload into their own club's folder ({club_id}/...).
-- superadmin may upload anywhere in the bucket.
CREATE POLICY "club_images: club_admin insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'club-images'
  AND (
    public.current_user_role() = 'superadmin'
    OR (
      public.current_user_role() = 'club_admin'
      AND (storage.foldername(name))[1] = (
        SELECT club_id::text
        FROM public.club_admins
        WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()::text LIMIT 1)
        LIMIT 1
      )
    )
  )
);

-- Allow replace (upsert: true) — same scope as INSERT.
CREATE POLICY "club_images: club_admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'club-images'
  AND (
    public.current_user_role() = 'superadmin'
    OR (
      public.current_user_role() = 'club_admin'
      AND (storage.foldername(name))[1] = (
        SELECT club_id::text
        FROM public.club_admins
        WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()::text LIMIT 1)
        LIMIT 1
      )
    )
  )
);

-- Allow delete for cleanup.
CREATE POLICY "club_images: club_admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'club-images'
  AND (
    public.current_user_role() = 'superadmin'
    OR (
      public.current_user_role() = 'club_admin'
      AND (storage.foldername(name))[1] = (
        SELECT club_id::text
        FROM public.club_admins
        WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()::text LIMIT 1)
        LIMIT 1
      )
    )
  )
);
