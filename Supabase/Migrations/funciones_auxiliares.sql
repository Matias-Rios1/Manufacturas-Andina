-- Mantiene actualizado el campo actualizado_en en cualquier tabla que lo tenga.
CREATE OR REPLACE FUNCTION public.set_actualizado_en()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;
 
-- Rol del usuario autenticado (NULL si no existe o está inactivo).
-- SECURITY DEFINER evita recursión al usarse dentro de políticas RLS.
CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT u.rol
    FROM public.usuarios u
    WHERE u.id = (SELECT auth.uid())
      AND u.activo
$$;