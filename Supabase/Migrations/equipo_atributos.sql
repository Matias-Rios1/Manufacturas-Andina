ALTER TABLE public.equipos
    ADD COLUMN IF NOT EXISTS marca text,
    ADD COLUMN IF NOT EXISTS modelo text,
    ADD COLUMN IF NOT EXISTS area text,
    ADD COLUMN IF NOT EXISTS criticidad text NOT NULL DEFAULT 'media',
    ADD COLUMN IF NOT EXISTS fecha_instalacion date;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.equipos'::regclass
          AND conname = 'equipos_criticidad_check'
    ) THEN
        ALTER TABLE public.equipos
            ADD CONSTRAINT equipos_criticidad_check
            CHECK (criticidad IN ('alta', 'media', 'baja'));
    END IF;
END
$$;

COMMENT ON COLUMN public.equipos.marca IS
    'Marca del equipo.';
COMMENT ON COLUMN public.equipos.modelo IS
    'Modelo del equipo.';
COMMENT ON COLUMN public.equipos.area IS
    'Área donde está ubicado el equipo.';
COMMENT ON COLUMN public.equipos.criticidad IS
    'Criticidad del equipo: alta, media o baja.';
COMMENT ON COLUMN public.equipos.fecha_instalacion IS
    'Fecha de instalación del equipo, opcional.';