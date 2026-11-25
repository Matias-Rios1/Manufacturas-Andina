/**
 * ConfUsers.js
 * Conecta la página «Configuración de usuarios» con el resto de las páginas del sitio web.
 *
 * - Menú lateral: navega entre las secciones y marca la sección activa.
 */
(function () {
  'use strict';

  // Sección que representa esta página en el menú lateral.
  const PAGINA_ACTUAL = 'configuracion';

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

  document.addEventListener('DOMContentLoaded', conectarMenuLateral);
})();