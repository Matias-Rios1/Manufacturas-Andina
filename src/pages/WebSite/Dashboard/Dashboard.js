/**
 * Dashboard.js
 * Conecta la página «Dashboard» con el resto de las páginas del sitio web.
 *
 * - Menú lateral: navega entre las secciones y marca la sección activa.
 * - «Gestionar» (Inventario crítico): abre la página de Inventario.
 * - Filas de órdenes: abren el historial de órdenes filtrado por la orden elegida.
 * - Filas de inventario crítico: abren el Inventario filtrado por el repuesto elegido.
 */
(function () {
  'use strict';

  // Sección que representa esta página en el menú lateral.
  const PAGINA_ACTUAL = 'dashboard';

  // Rutas relativas entre las carpetas de src/pages/WebSite/.
  const RUTAS = {
    'dashboard': '../Dashboard/Dashboard.html',
    'ordenes de trabajo': '../OrdenTrabajo/OrdenTrabajo.html',
    'inventario': '../Inventario/Inventario.html',
    'reportes': '../ReportesAnaliticos/ReportesAnaliticos.html',
    'configuracion': '../ConfUsers/ConfUsers.html'
  };

  /* ------------------------------ Utilidades ------------------------------ */

  // Minúsculas, sin tildes y con espacios simples.
  function normalizarTexto(texto) {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Deja solo las letras del texto de un enlace del menú (quita íconos y contadores).
  function etiquetaMenu(texto) {
    return texto.replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim();
  }

  // Navega a una sección; devuelve false si todavía no existe una página para ella.
  function irA(seccion, parametros) {
    const ruta = RUTAS[seccion];
    if (!ruta) {
      return false;
    }
    const consulta = parametros ? '?' + new URLSearchParams(parametros).toString() : '';
    window.location.href = ruta + consulta;
    return true;
  }

  let temporizadorAviso = null;

  // Mensaje breve en pantalla, sin depender de la hoja de estilos.
  function mostrarAviso(mensaje) {
    let aviso = document.getElementById('aviso-navegacion');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'aviso-navegacion';
      aviso.setAttribute('role', 'status');
      Object.assign(aviso.style, {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#142C32',
        color: '#D5F66A',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(20, 44, 50, 0.25)',
        zIndex: '1000',
        opacity: '0',
        transition: 'opacity 0.2s',
        pointerEvents: 'none'
      });
      document.body.appendChild(aviso);
    }
    aviso.textContent = mensaje;
    aviso.style.opacity = '1';
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () {
      aviso.style.opacity = '0';
    }, 2500);
  }

  /* ---------------------------- Menú lateral ----------------------------- */

  function conectarMenuLateral() {
    document.querySelectorAll('.nav-item').forEach(function (enlace) {
      const etiqueta = etiquetaMenu(enlace.textContent);
      const seccion = normalizarTexto(etiqueta);
      const esActual = seccion === PAGINA_ACTUAL;

      enlace.classList.toggle('active', esActual);
      if (esActual) {
        enlace.setAttribute('aria-current', 'page');
      } else {
        enlace.removeAttribute('aria-current');
      }

      enlace.addEventListener('click', function (evento) {
        evento.preventDefault();
        if (esActual) {
          return;
        }
        if (!irA(seccion)) {
          mostrarAviso('La sección «' + etiqueta + '» aún no está disponible.');
        }
      });
    });
  }

  /* ----------------------- Accesos propios del Dashboard ----------------------- */

  function hacerFilaNavegable(fila, titulo, alActivar) {
    fila.style.cursor = 'pointer';
    fila.tabIndex = 0;
    fila.title = titulo;
    fila.addEventListener('click', function (evento) {
      // Los controles de la fila (casillas, botones, enlaces) conservan su función.
      if (evento.target.closest('input, button, a')) {
        return;
      }
      alActivar();
    });
    fila.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter' && evento.target === fila) {
        alActivar();
      }
    });
  }

  function conectarAccesosDelDashboard() {
    // Inventario crítico → botón «Gestionar».
    const botonGestionar = Array.from(document.querySelectorAll('button')).find(function (boton) {
      return normalizarTexto(boton.textContent).includes('gestionar');
    });
    if (botonGestionar) {
      botonGestionar.addEventListener('click', function () {
        irA('inventario');
      });
    }

    // Tabla de órdenes de trabajo → historial de órdenes filtrado por código.
    document.querySelectorAll('.dashboard-content > .section-card table tbody tr').forEach(function (fila) {
      const celdaCodigo = fila.querySelector('strong');
      if (!celdaCodigo) {
        return;
      }
      const codigo = celdaCodigo.textContent.trim();
      hacerFilaNavegable(fila, 'Ver ' + codigo + ' en Órdenes de trabajo', function () {
        irA('ordenes de trabajo', { buscar: codigo });
      });
    });

    // Tabla de inventario crítico → inventario filtrado por nombre del repuesto.
    document.querySelectorAll('.bottom-grid .section-card table tbody tr').forEach(function (fila) {
      const celdaNombre = fila.querySelector('strong');
      if (!celdaNombre) {
        return;
      }
      const nombre = celdaNombre.textContent.trim();
      hacerFilaNavegable(fila, 'Ver «' + nombre + '» en Inventario', function () {
        irA('inventario', { buscar: nombre });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    conectarMenuLateral();
    conectarAccesosDelDashboard();
  });
})();