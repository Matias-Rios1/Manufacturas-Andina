CREATE TABLE IF NOT EXISTS avisos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id           uuid NOT NULL
                        REFERENCES equipos (id) ON DELETE RESTRICT,
    reportado_por_id    uuid NOT NULL
                        REFERENCES usuarios (id) ON DELETE RESTRICT,
    tipo_falla          text NOT NULL
                        CHECK (tipo_falla IN ('vibracion', 'fuga', 'ruido', 'otra')),
    descripcion         text NOT NULL DEFAULT ''
                        CHECK (char_length(descripcion) <= 500),
    foto_path           text,
    estado              text NOT NULL DEFAULT 'recibido'
                        CHECK (estado IN ('recibido', 'en_atencion', 'cerrado')),
    reportado_en        timestamptz NOT NULL DEFAULT now(),
    creado_en           timestamptz NOT NULL DEFAULT now(),
    actualizado_en      timestamptz NOT NULL DEFAULT now()
);
 
COMMENT ON TABLE avisos IS
    'Avisos de falla o anomalía reportados en terreno; siempre asociados a un equipo.';
COMMENT ON COLUMN avisos.reportado_en IS
    'Momento en que el usuario capturó el aviso en el teléfono (puede ser anterior a creado_en si estaba sin conexión).';
COMMENT ON COLUMN avisos.foto_path IS
    'Ruta de la fotografía opcional en el bucket avisos-fotos de Storage.';
 
CREATE INDEX IF NOT EXISTS idx_avisos_equipo_id ON avisos (equipo_id);
CREATE INDEX IF NOT EXISTS idx_avisos_reportado_por ON avisos (reportado_por_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_avisos_estado ON avisos (estado);
 
DROP TRIGGER IF EXISTS trg_avisos_actualizado ON avisos;
CREATE TRIGGER trg_avisos_actualizado
    BEFORE UPDATE ON avisos
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();