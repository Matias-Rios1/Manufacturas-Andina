-- Roles: supervisor, tecnico, produccion. Sin sesión no se accede a nada.
-- Las políticas usan (SELECT auth.uid()) y public.rol_actual() para que Postgres
-- evalúe la función una sola vez por consulta.
 
ALTER TABLE usuarios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_tecnicos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervenciones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervencion_repuestos ENABLE ROW LEVEL SECURITY;
 
-- usuarios: cualquier usuario autenticado ve el directorio; solo el supervisor lo modifica.
DROP POLICY IF EXISTS usuarios_select ON usuarios;
CREATE POLICY usuarios_select ON usuarios
    FOR SELECT TO authenticated
    USING (true);
 
DROP POLICY IF EXISTS usuarios_supervisor_escritura ON usuarios;
CREATE POLICY usuarios_supervisor_escritura ON usuarios
    FOR ALL TO authenticated
    USING (public.rol_actual() = 'supervisor')
    WITH CHECK (public.rol_actual() = 'supervisor');
 
-- equipos: lectura para todos los roles (identificar y reportar); alta y edición solo supervisor.
DROP POLICY IF EXISTS equipos_select ON equipos;
CREATE POLICY equipos_select ON equipos
    FOR SELECT TO authenticated
    USING (public.rol_actual() IS NOT NULL);
 
DROP POLICY IF EXISTS equipos_insert ON equipos;
CREATE POLICY equipos_insert ON equipos
    FOR INSERT TO authenticated
    WITH CHECK (public.rol_actual() = 'supervisor');
 
DROP POLICY IF EXISTS equipos_update ON equipos;
CREATE POLICY equipos_update ON equipos
    FOR UPDATE TO authenticated
    USING (public.rol_actual() = 'supervisor')
    WITH CHECK (public.rol_actual() = 'supervisor');
 
-- avisos: cualquier rol activo reporta a su nombre; cada uno ve los suyos; supervisor ve y gestiona todos.
DROP POLICY IF EXISTS avisos_insert ON avisos;
CREATE POLICY avisos_insert ON avisos
    FOR INSERT TO authenticated
    WITH CHECK (
        public.rol_actual() IS NOT NULL
        AND reportado_por_id = (SELECT auth.uid())
    );
 
DROP POLICY IF EXISTS avisos_select ON avisos;
CREATE POLICY avisos_select ON avisos
    FOR SELECT TO authenticated
    USING (
        public.rol_actual() = 'supervisor'
        OR reportado_por_id = (SELECT auth.uid())
    );
 
DROP POLICY IF EXISTS avisos_update ON avisos;
CREATE POLICY avisos_update ON avisos
    FOR UPDATE TO authenticated
    USING (public.rol_actual() = 'supervisor')
    WITH CHECK (public.rol_actual() = 'supervisor');
 
-- ordenes_trabajo: crear y asignar solo supervisor (CA-3-5);
-- el técnico ve únicamente las órdenes que tiene asignadas; producción no accede.
DROP POLICY IF EXISTS ordenes_select ON ordenes_trabajo;
CREATE POLICY ordenes_select ON ordenes_trabajo
    FOR SELECT TO authenticated
    USING (
        public.rol_actual() = 'supervisor'
        OR tecnico_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM orden_tecnicos ot
            WHERE ot.orden_id = ordenes_trabajo.id
              AND ot.tecnico_id = (SELECT auth.uid())
        )
    );
 
DROP POLICY IF EXISTS ordenes_insert ON ordenes_trabajo;
CREATE POLICY ordenes_insert ON ordenes_trabajo
    FOR INSERT TO authenticated
    WITH CHECK (public.rol_actual() = 'supervisor');
 
DROP POLICY IF EXISTS ordenes_update ON ordenes_trabajo;
CREATE POLICY ordenes_update ON ordenes_trabajo
    FOR UPDATE TO authenticated
    USING (public.rol_actual() = 'supervisor')
    WITH CHECK (public.rol_actual() = 'supervisor');
 
-- orden_tecnicos: asigna el supervisor; cada técnico ve sus propias asignaciones.
DROP POLICY IF EXISTS orden_tecnicos_select ON orden_tecnicos;
CREATE POLICY orden_tecnicos_select ON orden_tecnicos
    FOR SELECT TO authenticated
    USING (
        public.rol_actual() = 'supervisor'
        OR tecnico_id = (SELECT auth.uid())
    );
 
DROP POLICY IF EXISTS orden_tecnicos_escritura ON orden_tecnicos;
CREATE POLICY orden_tecnicos_escritura ON orden_tecnicos
    FOR ALL TO authenticated
    USING (public.rol_actual() = 'supervisor')
    WITH CHECK (public.rol_actual() = 'supervisor');
 
-- Tablas de intervenciones y repuestos (se usan en sprints posteriores):
-- se dejan con acceso mínimo coherente para no bloquearlas por completo.
DROP POLICY IF EXISTS intervenciones_select ON intervenciones;
CREATE POLICY intervenciones_select ON intervenciones
    FOR SELECT TO authenticated
    USING (
        public.rol_actual() = 'supervisor'
        OR tecnico_id = (SELECT auth.uid())
    );
 
DROP POLICY IF EXISTS intervenciones_escritura ON intervenciones;
CREATE POLICY intervenciones_escritura ON intervenciones
    FOR ALL TO authenticated
    USING (
        public.rol_actual() = 'supervisor'
        OR (public.rol_actual() = 'tecnico' AND tecnico_id = (SELECT auth.uid()))
    )
    WITH CHECK (
        public.rol_actual() = 'supervisor'
        OR (public.rol_actual() = 'tecnico' AND tecnico_id = (SELECT auth.uid()))
    );
 
DROP POLICY IF EXISTS repuestos_select ON repuestos;
CREATE POLICY repuestos_select ON repuestos
    FOR SELECT TO authenticated
    USING (public.rol_actual() IS NOT NULL);
 
DROP POLICY IF EXISTS repuestos_escritura ON repuestos;
CREATE POLICY repuestos_escritura ON repuestos
    FOR ALL TO authenticated
    USING (public.rol_actual() = 'supervisor')
    WITH CHECK (public.rol_actual() = 'supervisor');
 
DROP POLICY IF EXISTS intervencion_repuestos_select ON intervencion_repuestos;
CREATE POLICY intervencion_repuestos_select ON intervencion_repuestos
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM intervenciones i
            WHERE i.id = intervencion_repuestos.intervencion_id
              AND (public.rol_actual() = 'supervisor' OR i.tecnico_id = (SELECT auth.uid()))
        )
    );
 
DROP POLICY IF EXISTS intervencion_repuestos_escritura ON intervencion_repuestos;
CREATE POLICY intervencion_repuestos_escritura ON intervencion_repuestos
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM intervenciones i
            WHERE i.id = intervencion_repuestos.intervencion_id
              AND (public.rol_actual() = 'supervisor' OR i.tecnico_id = (SELECT auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM intervenciones i
            WHERE i.id = intervencion_repuestos.intervencion_id
              AND (public.rol_actual() = 'supervisor' OR i.tecnico_id = (SELECT auth.uid()))
        )
    );