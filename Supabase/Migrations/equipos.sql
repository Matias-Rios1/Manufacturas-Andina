ALTER TABLE equipos
    ADD COLUMN IF NOT EXISTS marca          text,
    ADD COLUMN IF NOT EXISTS modelo         text,
    ADD COLUMN IF NOT EXISTS criticidad     text NOT NULL DEFAULT 'media',
    ADD COLUMN IF NOT EXISTS actualizado_por uuid REFERENCES usuarios (id) ON DELETE SET NULL;
 
ALTER TABLE equipos DROP CONSTRAINT IF EXISTS equipos_criticidad_valida;
ALTER TABLE equipos
    ADD CONSTRAINT equipos_criticidad_valida
    CHECK (criticidad IN ('alta', 'media', 'baja'));
 
-- Normaliza el identificador y genera el QR (CA-9.1-2, CA-9.1-3):
-- contenido del QR = 'MANTTO:' + identificador, igual que el generador de CodigoQR.js.
-- Impide cambiar identificador y QR después de creados (CA-9.2-2) y
-- registra quién modificó el activo (CA-9.2-3).
CREATE OR REPLACE FUNCTION public.preparar_equipo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.identificador := upper(btrim(NEW.identificador));
        NEW.codigo_qr := 'MANTTO:' || NEW.identificador;
    ELSE
        IF NEW.identificador IS DISTINCT FROM OLD.identificador
           OR NEW.codigo_qr IS DISTINCT FROM OLD.codigo_qr THEN
            RAISE EXCEPTION 'El identificador y el código QR de un equipo no se pueden modificar.'
                USING ERRCODE = 'check_violation';
        END IF;
        NEW.actualizado_en := now();
    END IF;
    NEW.actualizado_por := (SELECT auth.uid());
    RETURN NEW;
END;
$$;
 
DROP TRIGGER IF EXISTS trg_equipos_preparar ON equipos;
CREATE TRIGGER trg_equipos_preparar
    BEFORE INSERT OR UPDATE ON equipos
    FOR EACH ROW EXECUTE FUNCTION public.preparar_equipo();
 
CREATE INDEX IF NOT EXISTS idx_equipos_estado ON equipos (estado);
CREATE INDEX IF NOT EXISTS idx_equipos_ubicacion ON equipos (ubicacion);
 