BEGIN;

-- 1) Un solo trigger de creación de perfil (había dos sobre auth.users).
DROP TRIGGER IF EXISTS trg_auth_crear_perfil ON auth.users;

-- 2) Roles válidos: se agrega admin.
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'supervisor', 'tecnico', 'produccion', 'bodega', 'jefatura'));

-- 3) rol_actual() devuelve 'supervisor' para el admin, así las políticas existentes le dan acceso completo.
CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN u.rol = 'admin' THEN 'supervisor' ELSE u.rol END
  FROM public.usuarios u
  WHERE u.id = (SELECT auth.uid()) AND u.activo
$$;

-- 4) Rol real, por si la interfaz necesita distinguir al admin.
CREATE OR REPLACE FUNCTION public.rol_real()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.rol FROM public.usuarios u
  WHERE u.id = (SELECT auth.uid()) AND u.activo
$$;

COMMIT;