INSERT INTO storage.buckets (id, name, public)
VALUES ('avisos-fotos', 'avisos-fotos', false)
ON CONFLICT (id) DO NOTHING;
 
DROP POLICY IF EXISTS avisos_fotos_insert ON storage.objects;
CREATE POLICY avisos_fotos_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avisos-fotos'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );
 
DROP POLICY IF EXISTS avisos_fotos_select ON storage.objects;
CREATE POLICY avisos_fotos_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'avisos-fotos'
        AND (
            public.rol_actual() = 'supervisor'
            OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
        )
    );