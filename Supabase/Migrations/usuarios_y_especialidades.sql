BEGIN;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('tecnico', 'supervisor', 'produccion', 'bodega', 'jefatura'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.usuarios'::regclass
      AND conname = 'usuarios_id_auth_users_fkey'
  ) THEN
    ALTER TABLE public.usuarios
      ADD CONSTRAINT usuarios_id_auth_users_fkey
      FOREIGN KEY (id)
      REFERENCES auth.users (id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, correo, rol)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nombre', ''), NEW.email),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'rol', ''), 'produccion')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  creado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.especialidades IS 'Catálogo de especialidades de los usuarios.';
COMMENT ON COLUMN public.especialidades.id IS 'Identificador único de la especialidad.';
COMMENT ON COLUMN public.especialidades.nombre IS 'Nombre único de la especialidad.';
COMMENT ON COLUMN public.especialidades.creado_en IS 'Fecha y hora de creación de la especialidad.';

CREATE TABLE IF NOT EXISTS public.usuario_especialidades (
  usuario_id uuid NOT NULL
    REFERENCES public.usuarios (id) ON DELETE CASCADE,
  especialidad_id uuid NOT NULL
    REFERENCES public.especialidades (id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, especialidad_id)
);

COMMENT ON TABLE public.usuario_especialidades IS 'Relación entre usuarios y sus especialidades.';
COMMENT ON COLUMN public.usuario_especialidades.usuario_id IS 'Usuario asociado a la especialidad.';
COMMENT ON COLUMN public.usuario_especialidades.especialidad_id IS 'Especialidad asociada al usuario.';

CREATE INDEX IF NOT EXISTS idx_usuario_especialidades_especialidad_id
  ON public.usuario_especialidades (especialidad_id);

COMMIT;