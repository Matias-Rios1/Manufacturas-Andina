/**
 * OrdenTrabajo.js
 * Conecta la página «Historial de órdenes de trabajo» con el resto del sitio web.
 *
 * - Menú lateral: navega entre las secciones y marca la sección activa.
 * - Búsqueda de la tabla: filtra las órdenes al escribir y también cuando la
 *   página se abre con el parámetro ?buscar=... (por ejemplo, desde el Dashboard
 *   o desde «Ver historial» en Reportes analíticos).
 */
(function () {
  'use strict';

  // Sección que representa esta página en el menú lateral.
  const PAGINA_ACTUAL = 'ordenes de trabajo';

  // Rutas relativas entre las carpetas de src/pages/WebSite/.
  const RUTAS = {
    'dashboard': '../Dashboard/Dashboard.html',
    'equipos': '../Equipos/Equipos.html',
    'ordenes de trabajo': '../OrdenTrabajo/OrdenTrabajo.html',
    'inventario': '../Inventario/Inventario.html',
    'codigos qr': '../CodigoQR/CodigoQR.html',
    'reportes': '../ReportesAnaliticos/ReportesAnaliticos.html',
    'configuracion': '../ConfUsers/ConfUsers.html',
    'centro de ayuda': '../CentroAyuda/CentroAyuda.html'
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

  /* ---------------------- Búsqueda en la tabla de órdenes ---------------------- */

  function conectarBusqueda() {
    const campo = document.querySelector('.table-search');
    const tabla = document.querySelector('.data-table');
    if (!campo || !tabla || !tabla.tBodies.length) {
      return;
    }

    const cuerpo = tabla.tBodies[0];

    // Fila que se muestra cuando ninguna orden coincide con la búsqueda.
    const filaVacia = document.createElement('tr');
    const celdaVacia = document.createElement('td');
    celdaVacia.colSpan = tabla.querySelectorAll('thead th').length || 1;
    celdaVacia.style.textAlign = 'center';
    celdaVacia.style.color = '#53666A';
    filaVacia.hidden = true;
    filaVacia.appendChild(celdaVacia);
    cuerpo.appendChild(filaVacia);

    function filtrar(texto) {
      const consulta = normalizarTexto(texto);
      let visibles = 0;

      Array.from(cuerpo.rows).forEach(function (fila) {
        if (fila === filaVacia) {
          return;
        }
        const contenido = normalizarTexto(
          Array.from(fila.cells).map(function (celda) { return celda.textContent; }).join(' ')
        );
        const coincide = contenido.includes(consulta);
        fila.hidden = !coincide;
        if (coincide) {
          visibles += 1;
        }
      });

      celdaVacia.textContent = 'No se encontraron órdenes para «' + texto.trim() + '».';
      filaVacia.hidden = visibles > 0;
    }

    campo.addEventListener('input', function () {
      filtrar(campo.value);
    });

    // Búsqueda recibida desde otra página (?buscar=...).
    const recibida = new URLSearchParams(window.location.search).get('buscar');
    if (recibida) {
      campo.value = recibida;
      filtrar(recibida);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    conectarMenuLateral();
    conectarBusqueda();
  });
})();