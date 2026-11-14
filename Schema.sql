-- UUIDs: gen_random_uuid() está disponible en versiones modernas de PostgreSQL.

CREATE TABLE equipos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identificador   text NOT NULL UNIQUE,
    codigo_qr       text NOT NULL UNIQUE,
    nombre          text NOT NULL,
    descripcion     text,
    ubicacion       text,
    estado          text NOT NULL DEFAULT 'operativo'
                    CHECK (estado IN (
                        'operativo',
                        'en_mantenimiento',
                        'fuera_de_servicio',
                        'retirado'
                    )),
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE equipos IS
    'Activos industriales mantenidos por la organización.';
COMMENT ON COLUMN equipos.identificador IS
    'Identificador interno único del equipo, por ejemplo, el número de activo.';
COMMENT ON COLUMN equipos.codigo_qr IS
    'Contenido único codificado en el QR; puede ser una URL o un identificador.';
COMMENT ON COLUMN equipos.actualizado_en IS
    'Fecha de última actualización; debe actualizarse desde la aplicación o mediante un trigger.';


CREATE TABLE usuarios (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          text NOT NULL,
    correo          text NOT NULL UNIQUE,
    rol             text NOT NULL
                    CHECK (rol IN (
                        'tecnico',
                        'supervisor',
                        'produccion'
                    )),
    activo          boolean NOT NULL DEFAULT true,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE usuarios IS
    'Personas que participan en el mantenimiento o la operación.';
COMMENT ON COLUMN usuarios.rol IS
    'Rol funcional del usuario. La clave foránea no comprueba por sí sola que un técnico asignado tenga el rol tecnico.';


CREATE TABLE ordenes_trabajo (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipo_id           uuid NOT NULL
                        REFERENCES equipos (id) ON DELETE RESTRICT,
    tecnico_id          uuid NOT NULL
                        REFERENCES usuarios (id) ON DELETE RESTRICT,
    creado_por_id       uuid
                        REFERENCES usuarios (id) ON DELETE SET NULL,
    titulo              text NOT NULL,
    descripcion         text,
    estado              text NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN (
                            'pendiente',
                            'asignada',
                            'en_progreso',
                            'en_espera',
                            'completada',
                            'cancelada'
                        )),
    gravedad            text NOT NULL DEFAULT 'media'
                        CHECK (gravedad IN (
                            'baja',
                            'media',
                            'alta',
                            'critica'
                        )),
    fecha_limite        timestamptz,
    creada_en           timestamptz NOT NULL DEFAULT now(),
    actualizado_en      timestamptz NOT NULL DEFAULT now(),
    completada_en       timestamptz
);

COMMENT ON TABLE ordenes_trabajo IS
    'Solicitudes y tareas de mantenimiento asociadas a un equipo y a un técnico responsable.';
COMMENT ON COLUMN ordenes_trabajo.gravedad IS
    'Severidad o impacto operativo de la orden.';
COMMENT ON COLUMN ordenes_trabajo.creado_por_id IS
    'Usuario que reportó o creó la orden, si se conoce.';


CREATE TABLE intervenciones (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id            uuid NOT NULL
                        REFERENCES ordenes_trabajo (id) ON DELETE RESTRICT,
    tecnico_id          uuid NOT NULL
                        REFERENCES usuarios (id) ON DELETE RESTRICT,
    descripcion         text NOT NULL,
    iniciado_en         timestamptz NOT NULL,
    finalizado_en       timestamptz,
    creado_en           timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT intervenciones_fechas_validas
        CHECK (finalizado_en IS NULL OR finalizado_en >= iniciado_en)
);

COMMENT ON TABLE intervenciones IS
    'Registro de las tareas realizadas para atender una orden de trabajo.';
COMMENT ON COLUMN intervenciones.iniciado_en IS
    'Inicio de la intervención; se conserva como timestamptz para registrar la zona horaria.';
COMMENT ON COLUMN intervenciones.finalizado_en IS
    'Fin de la intervención. Si es NULL, la intervención puede seguir abierta.';


CREATE TABLE repuestos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku             text NOT NULL UNIQUE,
    nombre          text NOT NULL,
    descripcion     text,
    unidad          text NOT NULL DEFAULT 'unidad',
    creado_en       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE repuestos IS
    'Catálogo de repuestos y consumibles que pueden registrarse en las intervenciones.';
COMMENT ON COLUMN repuestos.sku IS
    'Código único del repuesto en el inventario.';
COMMENT ON COLUMN repuestos.unidad IS
    'Unidad de medida, por ejemplo: unidad, litro o metro.';


CREATE TABLE intervencion_repuestos (
    intervencion_id     uuid NOT NULL
                        REFERENCES intervenciones (id) ON DELETE CASCADE,
    repuesto_id         uuid NOT NULL
                        REFERENCES repuestos (id) ON DELETE RESTRICT,
    cantidad            numeric(12, 3) NOT NULL
                        CHECK (cantidad > 0),
    costo_unitario      numeric(12, 2)
                        CHECK (costo_unitario IS NULL OR costo_unitario >= 0),
    PRIMARY KEY (intervencion_id, repuesto_id)
);

COMMENT ON TABLE intervencion_repuestos IS
    'Repuestos utilizados en cada intervención, con cantidad y costo opcional.';
COMMENT ON COLUMN intervencion_repuestos.costo_unitario IS
    'Costo unitario registrado al momento del uso; NULL si no se necesita control de costos.';


-- Índices para consultas y joins habituales por claves foráneas.
CREATE INDEX idx_ordenes_equipo_id
    ON ordenes_trabajo (equipo_id);

CREATE INDEX idx_ordenes_tecnico_id_estado
    ON ordenes_trabajo (tecnico_id, estado);

CREATE INDEX idx_ordenes_creada_en
    ON ordenes_trabajo (creada_en DESC);

CREATE INDEX idx_intervenciones_orden_id
    ON intervenciones (orden_id);

CREATE INDEX idx_intervenciones_tecnico_id
    ON intervenciones (tecnico_id);

CREATE INDEX idx_intervencion_repuestos_repuesto_id
    ON intervencion_repuestos (repuesto_id);
