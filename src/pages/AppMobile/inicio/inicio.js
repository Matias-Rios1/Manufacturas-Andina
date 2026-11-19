/**
 * inicio.js
 * Lógica de la pantalla de inicio de la app móvil.
 *
 * - Saludo, turno y estado de sincronización (incluye avisos pendientes de envío).
 * - Técnico: órdenes asignadas ordenadas por prioridad, visibles también sin conexión (HU-3).
 * - Personal de producción: sus avisos con el estado de atención (HU-2).
 * - Accesos: escanear equipo (HU-1), reportar falla (HU-2), detalle de orden y cierre de sesión.
 */
(function () {
  'use strict';

  const M = window.Mantto;
  const esc = M.ui.esc;
  const util = M.util;

  const FLECHA = '<svg class="flecha-orden" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.75 3.75L12 9L6.75 14.25" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke="#53666A"/></svg>';
  const ESTADO_AVISO = {
    recibido: { texto: 'Recibido', clase: 'badge-gris', barra: 'barra-verde' },
    en_atencion: { texto: 'En atención', clase: 'badge-azul', barra: 'barra-verde' },
    resuelto: { texto: 'Resuelto', clase: 'badge-verde', barra: 'barra-verde' },
    pendiente_envio: { texto: 'Por enviar', clase: 'badge-rojo', barra: 'barra-roja' }
  };

  let perfil = null;
  let esProduccion = false;
  let ordenes = [];
  let avisos = [];
  let expandido = false;

  M.iniciar().then(function (p) {
    if (!p) return;
    perfil = p;
    esProduccion = p.rol === 'produccion';
    arrancar();
  });

  function arrancar() {
    pintarCabecera();
    adaptarRol();
    conectarAcciones();
    conectarNavegacion();
    conectarLista();
    cargar();
    pintarSync();
    window.addEventListener('online', function () { cargar(); pintarSync(); });
    window.addEventListener('offline', pintarSync);
    window.addEventListener('mantto:cola', function () {
      pintarSync();
      if (esProduccion) cargar();
    });
    setInterval(pintarSync, 30000);
  }

  /* ------------------------------- Cabecera ------------------------------- */

  function pintarCabecera() {
    document.querySelector('.header-greeting h1').textContent = 'Buen turno, ' + util.primerNombre(perfil.nombre);
    document.querySelector('.header-greeting p').textContent = M.cfg.PLANTA + ' · ' + util.turno();
  }

  function adaptarRol() {
    if (!esProduccion) return;
    document.querySelector('.ordenes-header h2').textContent = 'Mis avisos';
    document.querySelectorAll('.bottom-nav .nav-item span').forEach(function (s) {
      if (util.normalizar(s.textContent) === 'ordenes') s.textContent = 'Avisos';
    });
  }

  function dos(numero) {
    return String(numero).padStart(2, '0');
  }

  function pintarIndicadores() {
    const valores = document.querySelectorAll('.indicador .valor');
    const etiquetas = document.querySelectorAll('.indicador .etiqueta');
    if (esProduccion) {
      valores[0].textContent = dos(avisos.length);
      valores[1].textContent = dos(avisos.filter(function (a) { return a.estado === 'en_atencion'; }).length);
      etiquetas[0].textContent = 'Enviados';
      etiquetas[1].textContent = 'En atención';
    } else {
      valores[0].textContent = dos(ordenes.length);
      valores[1].textContent = dos(ordenes.filter(function (o) { return o.prioridad === 'alta'; }).length);
      etiquetas[0].textContent = 'Asignadas';
      etiquetas[1].textContent = 'Urgentes';
    }
  }

  // Muestra la última sincronización o, sin conexión, el momento de los datos y los envíos pendientes.
  function pintarSync() {
    const contenedor = document.querySelector('.sync-status');
    const texto = contenedor.querySelector('span');
    const equipos = M.cache.leer('equipos');
    const guardadas = M.cache.leer('ordenes');
    const fechas = [equipos && equipos.sincronizadoEn, guardadas && guardadas.sincronizadoEn].filter(Boolean).sort();
    const ultima = fechas.length ? fechas[fechas.length - 1] : null;
    const enLinea = navigator.onLine !== false;
    const pendientes = M.datos.pendientes();

    let mensaje = enLinea
      ? (ultima ? 'Sincronizado ' + util.hace(ultima) : 'Sincronizando…')
      : 'Sin conexión' + (ultima ? ' · datos de ' + util.hace(ultima) : '');
    if (pendientes) {
      mensaje += ' · ' + pendientes + (pendientes === 1 ? ' aviso por enviar' : ' avisos por enviar');
    }
    texto.textContent = mensaje;
    contenedor.classList.toggle('offline', !enLinea || pendientes > 0);
  }

  /* --------------------------------- Lista --------------------------------- */

  async function cargar() {
    if (esProduccion) {
      const previo = M.cache.leer('avisos');
      if (previo && previo.uid === perfil.id && !avisos.length) {
        avisos = previo.datos;
        pintarLista();
      }
      avisos = (await M.datos.listarAvisos(perfil.id)).datos;
    } else {
      const previo = M.cache.leer('ordenes');
      if (previo && previo.uid === perfil.id && !ordenes.length) {
        ordenes = previo.datos;
        pintarLista();
      }
      const r = await M.datos.listarOrdenes(perfil.id);
      ordenes = r.datos;
      if (r.error) M.ui.aviso('No se pudieron actualizar las órdenes.');
    }
    pintarLista();
    pintarSync();
  }

  function tarjetaOrden(orden) {
    const alta = orden.prioridad === 'alta';
    const textoBadge = orden.estado === 'en_progreso' ? 'En curso'
      : (alta ? 'Alta prioridad' : (orden.tipo === 'preventiva' ? 'Programada' : 'Prioridad ' + orden.prioridad));
    const equipo = orden.equipo || {};
    return '<article class="orden-card ' + (alta ? 'card-alta' : 'card-programada') + '" data-id="' + esc(orden.id) + '" tabindex="0" role="link">' +
      '<div class="barra-prioridad ' + (alta ? 'barra-roja' : 'barra-verde') + '"></div>' +
      '<div class="orden-info-top"><span class="codigo-ot">' + esc(util.codigoOT(orden)) + ' · ' + esc(String(orden.tipo || '').toUpperCase()) + '</span>' +
      '<span class="badge ' + (alta ? 'badge-rojo' : 'badge-verde') + '">' + esc(textoBadge) + '</span></div>' +
      '<h3 class="orden-titulo">' + esc(equipo.nombre || orden.titulo) + '</h3>' +
      '<div class="orden-info-bottom"><span class="ubicacion-tiempo">' + esc([equipo.ubicacion, util.fechaCorta(orden.fecha_limite)].filter(Boolean).join(' · ')) + '</span>' + FLECHA + '</div>' +
      '</article>';
  }

  function tarjetaAviso(aviso) {
    const estado = ESTADO_AVISO[aviso.estado] || { texto: aviso.estado, clase: 'badge-gris', barra: 'barra-verde' };
    const equipo = aviso.equipo || {};
    return '<article class="orden-card">' +
      '<div class="barra-prioridad ' + estado.barra + '"></div>' +
      '<div class="orden-info-top"><span class="codigo-ot">AV-' + esc(String(aviso.id).slice(0, 6).toUpperCase()) + ' · ' + esc(String(aviso.tipo_falla || '').toUpperCase()) + '</span>' +
      '<span class="badge ' + estado.clase + '">' + esc(estado.texto) + '</span></div>' +
      '<h3 class="orden-titulo">' + esc(equipo.nombre || 'Equipo') + '</h3>' +
      '<div class="orden-info-bottom"><span class="ubicacion-tiempo">' + esc([equipo.ubicacion, util.fechaCorta(aviso.creado_en)].filter(Boolean).join(' · ')) + '</span></div>' +
      '</article>';
  }

  function pintarLista() {
    const contenedor = document.querySelector('.ordenes-prioritarias');
    contenedor.querySelectorAll('.orden-card, .vacio').forEach(function (n) { n.remove(); });
    const items = esProduccion ? avisos : ordenes;
    const enlace = contenedor.querySelector('.link-ver-todas');
    enlace.hidden = items.length <= 2;
    enlace.textContent = expandido ? 'Ver menos' : 'Ver todas';

    const visibles = expandido ? items : items.slice(0, 2);
    contenedor.insertAdjacentHTML('beforeend', visibles.length
      ? visibles.map(esProduccion ? tarjetaAviso : tarjetaOrden).join('')
      : '<p class="vacio">' + (esProduccion ? 'Aún no has reportado fallas.' : 'No tienes órdenes asignadas.') + '</p>');
    pintarIndicadores();
  }

  function conectarLista() {
    const contenedor = document.querySelector('.ordenes-prioritarias');
    contenedor.querySelector('.link-ver-todas').addEventListener('click', function (evento) {
      evento.preventDefault();
      expandido = !expandido;
      pintarLista();
    });
    function abrir(evento) {
      const tarjeta = evento.target.closest('.orden-card[data-id]');
      if (tarjeta) M.irA('orden', { id: tarjeta.dataset.id });
    }
    contenedor.addEventListener('click', abrir);
    contenedor.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter') abrir(evento);
    });
  }

  /* ------------------------------ Navegación ------------------------------ */

  function conectarAcciones() {
    document.querySelector('.card-escanear').addEventListener('click', function () {
      M.irA('escanear');
    });
    document.querySelector('.card-reportar').addEventListener('click', function () {
      M.irA('escanear', { destino: 'reportar' }); // primero se identifica el equipo (CA-2-3)
    });
  }

  function conectarNavegacion() {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(function (enlace) {
      enlace.addEventListener('click', function (evento) {
        evento.preventDefault();
        const seccion = util.normalizar(enlace.textContent);
        if (seccion === 'inicio') {
          window.scrollTo(0, 0);
          document.querySelector('.main-content').scrollTo(0, 0);
        } else if (seccion === 'ordenes' || seccion === 'avisos') {
          document.querySelector('.ordenes-prioritarias').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (seccion === 'escanear') {
          M.irA('escanear');
        } else if (seccion === 'cuenta') {
          if (window.confirm('¿Cerrar la sesión de ' + perfil.nombre + '?')) M.cerrarSesion();
        }
      });
    });
  }
})();