/**
 * CentroAyuda.js
 * Conecta la página «Centro de ayuda» con el resto de las páginas del sitio web.
 *
 * - Menú lateral: navega entre las secciones y marca la sección activa.
 * - Buscador: filtra preguntas y categorías mientras se escribe (y con las búsquedas frecuentes).
 * - Categorías: filtran las preguntas frecuentes.
 * - Preguntas frecuentes: acordeón con una respuesta abierta a la vez.
 */
(function () {
  'use strict';

  // Sección que representa esta página en el menú lateral.
  const PAGINA_ACTUAL = 'centro de ayuda';

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

  // Evita que el texto escrito por el usuario se interprete como HTML.
  function escaparHtml(texto) {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    }, 2800);
  }

  // Dibuja la numeración «‹ 1 2 3 … 22 ›» y avisa cuando se elige otra página.
  function dibujarPaginacion(contenedor, paginaActual, totalPaginas, alCambiar) {
    const paginas = [];
    for (let numero = 1; numero <= totalPaginas; numero += 1) {
      if (numero <= 3 || numero === totalPaginas || Math.abs(numero - paginaActual) <= 1) {
        paginas.push(numero);
      } else if (paginas[paginas.length - 1] !== '…') {
        paginas.push('…');
      }
    }
    contenedor.innerHTML = '';
    function crearBoton(texto, pagina, activo, deshabilitado, etiqueta) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'btn-pagina' + (activo ? ' active' : '');
      boton.textContent = texto;
      boton.disabled = deshabilitado;
      if (etiqueta) {
        boton.setAttribute('aria-label', etiqueta);
      }
      if (activo) {
        boton.setAttribute('aria-current', 'page');
      }
      boton.addEventListener('click', function () { alCambiar(pagina); });
      contenedor.appendChild(boton);
    }
    crearBoton('‹', paginaActual - 1, false, paginaActual <= 1, 'Página anterior');
    paginas.forEach(function (pagina) {
      if (pagina === '…') {
        const puntos = document.createElement('span');
        puntos.className = 'puntos-pagina';
        puntos.textContent = '…';
        contenedor.appendChild(puntos);
      } else {
        crearBoton(String(pagina), pagina, pagina === paginaActual, false, 'Página ' + pagina);
      }
    });
    crearBoton('›', paginaActual + 1, false, paginaActual >= totalPaginas, 'Página siguiente');
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

  /* ----------------------- Barra superior (búsqueda y hora) ----------------------- */

  // Búsqueda global: Enter abre Equipos con el texto buscado (o ejecuta alBuscar si se indica).
  // El atajo Ctrl/⌘ + K lleva el cursor al campo.
  function conectarBusquedaGlobal(alBuscar) {
    const campo = document.querySelector('.topbar .search-bar input');
    if (!campo) {
      return;
    }
    const atajo = document.querySelector('.topbar .search-bar .atajo');
    if (atajo && !/Mac|iPhone|iPad/.test(navigator.platform || '')) {
      atajo.textContent = 'Ctrl K';
    }
    campo.addEventListener('keydown', function (evento) {
      if (evento.key !== 'Enter') {
        return;
      }
      const texto = campo.value.trim();
      if (!texto) {
        return;
      }
      if (alBuscar) {
        alBuscar(texto);
      } else {
        irA('equipos', { buscar: texto });
      }
    });
    document.addEventListener('keydown', function (evento) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        campo.focus();
        campo.select();
      }
    });
  }

  // Muestra la hora actual en los elementos marcados con data-hora.
  function mostrarHoraActual() {
    const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    document.querySelectorAll('[data-hora]').forEach(function (elemento) {
      elemento.textContent = hora;
    });
  }

  /* ---------------------------- Centro de ayuda ---------------------------- */

  const NOMBRES_CATEGORIA = {
    'primeros-pasos': 'Primeros pasos',
    'equipos-qr': 'Equipos y QR',
    'ordenes': 'Órdenes de trabajo',
    'reportes': 'Reportes',
    'usuarios': 'Usuarios'
  };
  // Palabras que no ayudan a encontrar una respuesta.
  const PALABRAS_VACIAS = ['una', 'uno', 'unos', 'unas', 'los', 'las', 'del', 'con', 'por', 'para', 'que', 'como', 'mis', 'sus', 'mas'];

  const preguntas = Array.from(document.querySelectorAll('.faq-item'));
  const categorias = Array.from(document.querySelectorAll('.categoria'));
  const campoBusqueda = document.getElementById('buscar-ayuda');
  const botonVerTodos = document.getElementById('ver-todos');
  const avisoFiltro = document.getElementById('filtro-activo');
  const sinResultados = document.getElementById('sin-resultados');

  let categoriaActiva = '';
  let verTodos = false;

  // Palabras de la búsqueda, reducidas a su raíz para que «registrar» encuentre «registro».
  function raices(texto) {
    return normalizarTexto(texto)
      .split(' ')
      .filter(function (palabra) { return palabra.length > 2 && PALABRAS_VACIAS.indexOf(palabra) === -1; })
      .map(function (palabra) { return palabra.length > 5 ? palabra.slice(0, 5) : palabra; });
  }

  function textoDe(elemento, extra) {
    return normalizarTexto(elemento.textContent + ' ' + (extra || ''));
  }

  function coincide(elemento, palabras, extra) {
    const texto = textoDe(elemento, extra);
    return palabras.every(function (palabra) { return texto.includes(palabra); });
  }

  function actualizarAyuda() {
    const palabras = raices(campoBusqueda.value);
    const hayFiltro = palabras.length > 0 || categoriaActiva !== '';
    let visibles = 0;

    preguntas.forEach(function (pregunta) {
      const porCategoria = !categoriaActiva || pregunta.dataset.categoria === categoriaActiva;
      const porTexto = !palabras.length || coincide(pregunta, palabras, pregunta.dataset.claves);
      const porListado = hayFiltro || verTodos || pregunta.hasAttribute('data-principal');
      const mostrar = porCategoria && porTexto && porListado;
      pregunta.hidden = !mostrar;
      if (mostrar) {
        visibles += 1;
      }
    });

    // Las categorías también se filtran por el texto buscado.
    categorias.forEach(function (categoria) {
      const mostrar = !palabras.length || coincide(categoria, palabras, NOMBRES_CATEGORIA[categoria.dataset.categoria]) ||
        preguntas.some(function (p) { return !p.hidden && p.dataset.categoria === categoria.dataset.categoria; });
      categoria.hidden = !mostrar;
    });

    sinResultados.hidden = visibles > 0;

    // Resumen del filtro aplicado.
    avisoFiltro.hidden = !hayFiltro;
    const partes = [];
    if (categoriaActiva) {
      partes.push('Categoría: ' + NOMBRES_CATEGORIA[categoriaActiva]);
    }
    if (palabras.length) {
      partes.push('Búsqueda: «' + campoBusqueda.value.trim() + '»');
    }
    document.getElementById('texto-filtro-activo').textContent = partes.join(' · ') + ' — ' + visibles +
      (visibles === 1 ? ' resultado' : ' resultados');

    botonVerTodos.hidden = hayFiltro;
    botonVerTodos.textContent = verTodos ? 'Ver menos' : 'Ver todos los artículos';
    botonVerTodos.setAttribute('aria-expanded', verTodos ? 'true' : 'false');

    // Con una búsqueda, la primera respuesta queda abierta.
    if (palabras.length) {
      const primera = preguntas.find(function (p) { return !p.hidden; });
      preguntas.forEach(function (p) { alternarRespuesta(p, p === primera); });
    }
  }

  function alternarRespuesta(pregunta, abrir) {
    const boton = pregunta.querySelector('.faq-pregunta');
    const respuesta = pregunta.querySelector('.faq-respuesta');
    boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    respuesta.hidden = !abrir;
  }

  function conectarAyuda() {
    // Acordeón: solo una respuesta abierta a la vez.
    preguntas.forEach(function (pregunta) {
      pregunta.querySelector('.faq-pregunta').addEventListener('click', function () {
        const estabaAbierta = pregunta.querySelector('.faq-pregunta').getAttribute('aria-expanded') === 'true';
        preguntas.forEach(function (otra) { alternarRespuesta(otra, otra === pregunta && !estabaAbierta); });
      });
    });

    // Categorías: filtran las preguntas; pulsar la activa quita el filtro.
    categorias.forEach(function (categoria) {
      categoria.addEventListener('click', function () {
        categoriaActiva = categoriaActiva === categoria.dataset.categoria ? '' : categoria.dataset.categoria;
        categorias.forEach(function (otra) {
          otra.setAttribute('aria-pressed', otra.dataset.categoria === categoriaActiva ? 'true' : 'false');
        });
        actualizarAyuda();
        document.getElementById('titulo-faq').scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    });

    campoBusqueda.addEventListener('input', actualizarAyuda);
    document.getElementById('formulario-ayuda').addEventListener('submit', function (evento) {
      evento.preventDefault();
      actualizarAyuda();
      document.getElementById('titulo-faq').scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    document.querySelectorAll('.busqueda-frecuente').forEach(function (boton) {
      boton.addEventListener('click', function () {
        campoBusqueda.value = boton.textContent;
        actualizarAyuda();
        document.getElementById('titulo-faq').scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    });

    botonVerTodos.addEventListener('click', function () {
      verTodos = !verTodos;
      actualizarAyuda();
    });
    document.getElementById('quitar-filtro').addEventListener('click', function () {
      campoBusqueda.value = '';
      categoriaActiva = '';
      categorias.forEach(function (categoria) { categoria.setAttribute('aria-pressed', 'false'); });
      actualizarAyuda();
    });
  }

  function iniciarAyuda() {
    conectarAyuda();
    const recibida = new URLSearchParams(window.location.search).get('buscar');
    if (recibida) {
      campoBusqueda.value = recibida;
    }
    actualizarAyuda();
  }

  document.addEventListener('DOMContentLoaded', function () {
    conectarMenuLateral();
    conectarBusquedaGlobal(function (texto) { document.getElementById('buscar-ayuda').value = texto; actualizarAyuda(); });
    mostrarHoraActual();
    iniciarAyuda();
  });
})();