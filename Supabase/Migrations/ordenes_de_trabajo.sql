-- Una orden puede crearse antes de asignarse: el responsable pasa a ser opcional.
ALTER TABLE ordenes_trabajo ALTER COLUMN tecnico_id DROP NOT NULL;
 
ALTER TABLE ordenes_trabajo
    ADD COLUMN IF NOT EXISTS aviso_id uuid REFERENCES avisos (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'correctiva',
    ADD COLUMN IF NOT EXISTS especialidad_requerida text NOT NULL DEFAULT 'otra',
    ADD COLUMN IF NOT EXISTS riesgo_seguridad boolean NOT NULL DEFAULT false;
 
-- Los valores por defecto solo sirven para filas previas; las nuevas órdenes deben indicarlos.
ALTER TABLE ordenes_trabajo ALTER COLUMN tipo DROP DEFAULT;
ALTER TABLE ordenes_trabajo ALTER COLUMN especialidad_requerida DROP DEFAULT;
 
ALTER TABLE ordenes_trabajo DROP CONSTRAINT IF EXISTS ordenes_tipo_valido;
ALTER TABLE ordenes_trabajo
    ADD CONSTRAINT ordenes_tipo_valido
    CHECK (tipo IN ('correctiva', 'preventiva'));
 
ALTER TABLE ordenes_trabajo DROP CONSTRAINT IF EXISTS ordenes_especialidad_valida;
ALTER TABLE ordenes_trabajo
    ADD CONSTRAINT ordenes_especialidad_valida
    CHECK (especialidad_requerida IN ('mecanica', 'electrica', 'hidraulica', 'otra'));
 
-- CA-3-4: la prioridad es alta, media o baja. La columna gravedad (que admitía 'critica')
-- se convierte en prioridad.
UPDATE ordenes_trabajo SET gravedad = 'alta' WHERE gravedad = 'critica';
ALTER TABLE ordenes_trabajo DROP CONSTRAINT IF EXISTS ordenes_trabajo_gravedad_check;
ALTER TABLE ordenes_trabajo RENAME COLUMN gravedad TO prioridad;
ALTER TABLE ordenes_trabajo
    ADD CONSTRAINT ordenes_prioridad_valida
    CHECK (prioridad IN ('alta', 'media', 'baja'));
 
COMMENT ON COLUMN ordenes_trabajo.prioridad IS
    'Prioridad alta, media o baja según gravedad e impacto; un equipo detenido o con riesgo de seguridad es siempre alta.';
COMMENT ON COLUMN ordenes_trabajo.tecnico_id IS
    'Responsable principal (primer técnico asignado). El equipo completo está en orden_tecnicos.';
 
-- Regla de prioridad máxima para equipo detenido o con riesgo de seguridad.
CREATE OR REPLACE FUNCTION public.aplicar_regla_prioridad()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.riesgo_seguridad
       OR EXISTS (
            SELECT 1 FROM equipos e
            WHERE e.id = NEW.equipo_id AND e.estado = 'fuera_de_servicio'
       ) THEN
        NEW.prioridad := 'alta';
    END IF;
    RETURN NEW;
END;
$$;
 
DROP TRIGGER IF EXISTS trg_ordenes_prioridad ON ordenes_trabajo;
CREATE TRIGGER trg_ordenes_prioridad
    BEFORE INSERT OR UPDATE OF prioridad, equipo_id, riesgo_seguridad ON ordenes_trabajo
    FOR EACH ROW EXECUTE FUNCTION public.aplicar_regla_prioridad();
 
DROP TRIGGER IF EXISTS trg_ordenes_actualizado ON ordenes_trabajo;
CREATE TRIGGER trg_ordenes_actualizado
    BEFORE UPDATE ON ordenes_trabajo
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();
 
-- Si la orden nace de un aviso, el aviso pasa a «en atención» (CA-2-4).
CREATE OR REPLACE FUNCTION public.marcar_aviso_en_atencion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.aviso_id IS NOT NULL THEN
        UPDATE public.avisos
        SET estado = 'en_atencion'
        WHERE id = NEW.aviso_id AND estado = 'recibido';
    END IF;
    RETURN NEW;
END;
$$;
 
DROP TRIGGER IF EXISTS trg_ordenes_aviso ON ordenes_trabajo;
CREATE TRIGGER trg_ordenes_aviso
    AFTER INSERT ON ordenes_trabajo
    FOR EACH ROW EXECUTE FUNCTION public.marcar_aviso_en_atencion();
 
CREATE INDEX IF NOT EXISTS idx_ordenes_aviso_id ON ordenes_trabajo (aviso_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_trabajo (estado);
 
-- Asignación de una orden a uno o más técnicos (CA-3-2).
CREATE TABLE IF NOT EXISTS orden_tecnicos (
    orden_id        uuid NOT NULL
                    REFERENCES ordenes_trabajo (id) ON DELETE CASCADE,
    tecnico_id      uuid NOT NULL
                    REFERENCES usuarios (id) ON DELETE RESTRICT,
    asignado_en     timestamptz NOT NULL DEFAULT now(),
    asignado_por_id uuid REFERENCES usuarios (id) ON DELETE SET NULL,
    PRIMARY KEY (orden_id, tecnico_id)
);
 
COMMENT ON TABLE orden_tecnicos IS
    'Técnicos asignados a cada orden de trabajo; solo técnicos con la especialidad requerida (CA-3-3).';
 
CREATE INDEX IF NOT EXISTS idx_orden_tecnicos_tecnico ON orden_tecnicos (tecnico_id);
 
-- CA-3-3: solo técnicos activos con la especialidad requerida por la orden.
CREATE OR REPLACE FUNCTION public.validar_asignacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rol text;
    v_activo boolean;
    v_especialidades text[];
    v_requerida text;
BEGIN
    SELECT u.rol, u.activo, u.especialidades
      INTO v_rol, v_activo, v_especialidades
    FROM usuarios u WHERE u.id = NEW.tecnico_id;
 
    IF v_rol IS DISTINCT FROM 'tecnico' OR NOT COALESCE(v_activo, false) THEN
        RAISE EXCEPTION 'Solo se puede asignar una orden a técnicos activos.'
            USING ERRCODE = 'check_violation';
    END IF;
 
    SELECT o.especialidad_requerida INTO v_requerida
    FROM ordenes_trabajo o WHERE o.id = NEW.orden_id;
 
    IF NOT (v_requerida = ANY (v_especialidades)) THEN
        RAISE EXCEPTION 'El técnico no tiene la especialidad requerida (%).', v_requerida
            USING ERRCODE = 'check_violation';
    END IF;
 
    NEW.asignado_por_id := COALESCE(NEW.asignado_por_id, (SELECT auth.uid()));
    RETURN NEW;
END;
$$;
 
DROP TRIGGER IF EXISTS trg_orden_tecnicos_validar ON orden_tecnicos;
CREATE TRIGGER trg_orden_tecnicos_validar
    BEFORE INSERT OR UPDATE ON orden_tecnicos
    FOR EACH ROW EXECUTE FUNCTION public.validar_asignacion();
 
-- Al asignar: fija el responsable principal y pasa la orden de «pendiente» a «asignada».
CREATE OR REPLACE FUNCTION public.sincronizar_responsable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.ordenes_trabajo o
    SET tecnico_id = COALESCE(o.tecnico_id, NEW.tecnico_id),
        estado = CASE WHEN o.estado = 'pendiente' THEN 'asignada' ELSE o.estado END
    WHERE o.id = NEW.orden_id;
    RETURN NEW;
END;
$$;
 
DROP TRIGGER IF EXISTS trg_orden_tecnicos_sync ON orden_tecnicos;
CREATE TRIGGER trg_orden_tecnicos_sync
    AFTER INSERT ON orden_tecnicos
    FOR EACH ROW EXECUTE FUNCTION public.sincronizar_responsable();