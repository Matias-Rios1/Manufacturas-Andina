ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS especialidades text[] NOT NULL DEFAULT '{}';
 
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_especialidades_validas;
ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_especialidades_validas
    CHECK (especialidades <@ ARRAY['mecanica', 'electrica', 'hidraulica', 'otra']::text[]);
 
-- El id del perfil coincide con el id de auth.users.
-- NOT VALID: no revisa filas previas, solo las nuevas.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_id_auth_fkey;
ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_id_auth_fkey
    FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
    NOT VALID;
 
-- Al crear un usuario en Auth se crea su perfil con el rol más restrictivo.
-- El rol NO se toma de los metadatos que envía el cliente (evita escalar privilegios);
-- un supervisor lo cambia después desde Configuración, o se fija por SQL para el primero.
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.usuarios (id, nombre, correo, rol)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nombre', ''), split_part(NEW.email, '@', 1)),
        NEW.email,
        'produccion'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;
 
DROP TRIGGER IF EXISTS trg_auth_crear_perfil ON auth.users;
CREATE TRIGGER trg_auth_crear_perfil
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();
 
DROP TRIGGER IF EXISTS trg_usuarios_actualizado ON usuarios;
CREATE TRIGGER trg_usuarios_actualizado
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();