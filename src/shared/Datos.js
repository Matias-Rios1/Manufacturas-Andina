/**
 * datos.js — Consultas a Supabase usadas por la web y la app.
 * Requiere supabase.js cargado antes.
 */
(function () {
  'use strict';
  const db = () => window.mantto.db;

  // ---------- Sesión ----------
  async function iniciarSesion(correo, clave) {
    const { data, error } = await db().auth.signInWithPassword({ email: correo, password: clave });
    if (error) throw error;
    return data;
  }

  async function cerrarSesion() {
    await db().auth.signOut();
    location.href = '../../../src/pages/AppMobile/InicioSesion/InicioSesion.html';
  }

  // Exige sesión en las páginas web. Sin sesión, vuelve al inicio de sesión.
  async function exigirSesion() {
    const { data } = await db().auth.getSession();
    if (!data.session) {
      location.href = '../../../src/pages/AppMobile/InicioSesion/InicioSesion.html';
      return null;
    }
    const perfil = await perfilActual();
    const etiqueta = document.getElementById('mt-sesion');
    if (etiqueta && perfil) {
      etiqueta.textContent = perfil.nombre + ' · ' + perfil.rol;
    }
    return perfil;
  }

  async function perfilActual() {
    const { data: { user } } = await db().auth.getUser();
    if (!user) return null;
    const { data, error } = await db().from('usuarios')
      .select('id, nombre, correo, rol, activo').eq('id', user.id).single();
    if (error) throw error;
    return data;
  }

  // ---------- Equipos ----------
  async function listarEquipos({ estado, ubicacion, texto } = {}) {
    let q = db().from('equipos')
      .select('id, identificador, codigo_qr, nombre, ubicacion, marca, modelo, criticidad, estado, actualizado_en')
      .order('identificador');
    if (estado) q = q.eq('estado', estado);
    if (ubicacion) q = q.eq('ubicacion', ubicacion);
    if (texto) q = q.or('nombre.ilike.%' + texto + '%,identificador.ilike.%' + texto + '%');
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async function contarEquiposPorEstado() {
    const estados = ['operativo', 'en_mantenimiento', 'fuera_de_servicio'];
    const resultado = { total: 0 };
    for (const e of estados) {
      const { count, error } = await db().from('equipos')
        .select('id', { count: 'exact', head: true }).eq('estado', e);
      if (error) throw error;
      resultado[e] = count;
      resultado.total += count;
    }
    return resultado;
  }

  async function crearEquipo(datos) {
    const { data, error } = await db().from('equipos').insert(datos).select().single();
    if (error) throw error;
    return data;
  }

  // ---------- Órdenes de trabajo ----------
  async function listarOrdenes({ estado } = {}) {
    let q = db().from('ordenes_trabajo')
      .select('id, titulo, tipo, estado, prioridad, creada_en, fecha_limite,' +
        'equipos(identificador, nombre, ubicacion),' +
        'orden_tecnicos(usuarios(nombre))')
      .order('creada_en', { ascending: false });
    if (estado) q = q.eq('estado', estado);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  // ---------- Avisos ----------
  async function listarAvisos() {
    const { data, error } = await db().from('avisos')
      .select('id, tipo_falla, descripcion, estado, reportado_en, equipos(identificador, nombre), usuarios:reportado_por_id(nombre)')
      .order('reportado_en', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function crearAviso({ equipo_id, reportado_por_id, tipo_falla, descripcion }) {
    const { data, error } = await db().from('avisos')
      .insert({ equipo_id, reportado_por_id, tipo_falla, descripcion }).select().single();
    if (error) throw error;
    return data;
  }

  // ---------- Usuarios ----------
  async function listarUsuarios() {
    const { data, error } = await db().from('usuarios')
      .select('id, nombre, correo, rol, activo').order('nombre');
    if (error) throw error;
    return data;
  }

  window.mantto.datos = {
    iniciarSesion, cerrarSesion, exigirSesion, perfilActual,
    listarEquipos, contarEquiposPorEstado, crearEquipo,
    listarOrdenes, listarAvisos, crearAviso, listarUsuarios
  };
})();