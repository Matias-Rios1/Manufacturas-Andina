/**
 * Equipos.js
 * Conecta la página «Equipos» con el resto de las páginas del sitio web.
 *
 * - Menú lateral: navega entre las secciones y marca la sección activa.
 * - Tabla: filtra por estado, ubicación y texto (también con ?buscar=...).
 * - Panel lateral: edita un equipo o registra uno nuevo (el identificador es único y no se modifica).
 * - Importar planilla: lee un CSV, muestra las filas válidas y con observaciones, y confirma la carga.
 * - Ícono QR de cada fila: abre la etiqueta del equipo en Códigos QR.
 */
(function () {
  'use strict';

  // Sección que representa esta página en el menú lateral.
  const PAGINA_ACTUAL = 'equipos';

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

  /* --------------------------------- Datos --------------------------------- */

  const ESTADOS = {
    operativo: 'Operativo',
    en_mantenimiento: 'En mantenimiento',
    fuera_de_servicio: 'Fuera de servicio'
  };
  const TAMANO_PAGINA = 8;

  // Equipos de muestra de Planta Norte (en total la planta tiene 128).
  const equipos = [
    { id: 'EQ-004', codigo: 'B-04', nombre: 'Bomba centrífuga B-04', ubicacion: 'Línea 02', marca: 'Grundfos', modelo: 'NB 50-200', criticidad: 'Alta', estado: 'operativo', editado: '09:12' },
    { id: 'EQ-012', codigo: 'C-12', nombre: 'Compresor C-12', ubicacion: 'Sala de aire', marca: 'Atlas Copco', modelo: 'GA 37', criticidad: 'Alta', estado: 'en_mantenimiento', editado: null },
    { id: 'EQ-008', codigo: 'M-08', nombre: 'Motor eléctrico M-08', ubicacion: 'Línea 01', marca: 'Siemens', modelo: '1LE1 · 15 kW', criticidad: 'Media', estado: 'fuera_de_servicio', editado: null }
  ];

  // Totales de la planta; se ajustan al registrar equipos o cambiar su estado.
  const conteos = { total: 128, operativo: 116, en_mantenimiento: 8, fuera_de_servicio: 4 };

  let filtroEstado = 'todos';
  let paginaActual = 1;
  let seleccionado = null;   // id del equipo abierto en el panel
  let modoPanel = 'editar';  // 'editar' o 'nuevo'
  let importacionPendiente = [];

  const elementos = {
    layout: document.getElementById('equipos-layout'),
    cuerpo: document.getElementById('cuerpo-equipos'),
    busqueda: document.getElementById('buscar-equipo'),
    ubicacion: document.getElementById('filtro-ubicacion'),
    resumen: document.getElementById('resumen-equipos'),
    paginacion: document.getElementById('paginacion-equipos'),
    panel: document.getElementById('panel-equipo'),
    titulo: document.getElementById('panel-titulo'),
    subtitulo: document.getElementById('panel-subtitulo'),
    formulario: document.getElementById('formulario-equipo'),
    chipId: document.getElementById('chip-id'),
    ultimaEdicion: document.getElementById('ultima-edicion'),
    grupoId: document.getElementById('grupo-id'),
    campoId: document.getElementById('campo-id'),
    nombre: document.getElementById('campo-nombre'),
    campoUbicacion: document.getElementById('campo-ubicacion'),
    criticidad: document.getElementById('campo-criticidad'),
    marca: document.getElementById('campo-marca'),
    modelo: document.getElementById('campo-modelo'),
    estado: document.getElementById('campo-estado'),
    error: document.getElementById('panel-error'),
    guardar: document.getElementById('guardar-panel'),
    dialogo: document.getElementById('dialogo-importacion'),
    archivo: document.getElementById('archivo-planilla')
  };

  const ICONO_QR = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" stroke="#142C32"><path d="M11.25 10.5V15.75H15.75V12.75H13.5M2.25 2.25H7.5V7.5H2.25V2.25ZM10.5 2.25H15.75V7.5H10.5V2.25ZM2.25 10.5H7.5V15.75H2.25V10.5Z"/></svg>';

  /* ----------------------------- Indicadores ----------------------------- */

  function porcentaje(parte, total) {
    return (total ? (parte * 100) / total : 0).toFixed(1).replace('.', ',') + ' % del total';
  }

  function actualizarIndicadores() {
    const dosDigitos = function (n) { return String(n).padStart(2, '0'); };
    document.querySelector('[data-kpi="total"]').textContent = dosDigitos(conteos.total);
    Object.keys(ESTADOS).forEach(function (estado) {
      document.querySelector('[data-kpi="' + estado + '"]').textContent = dosDigitos(conteos[estado]);
      document.querySelector('[data-kpi-desc="' + estado + '"]').textContent = porcentaje(conteos[estado], conteos.total);
      document.querySelector('[data-contador="' + estado + '"]').textContent = conteos[estado];
    });
    document.querySelector('[data-contador="todos"]').textContent = conteos.total;
  }

  /* -------------------------------- Tabla -------------------------------- */

  function equiposFiltrados() {
    const consulta = normalizarTexto(elementos.busqueda.value);
    const ubicacion = elementos.ubicacion.value;
    return equipos.filter(function (equipo) {
      if (filtroEstado !== 'todos' && equipo.estado !== filtroEstado) {
        return false;
      }
      if (ubicacion && equipo.ubicacion !== ubicacion) {
        return false;
      }
      if (!consulta) {
        return true;
      }
      const texto = [equipo.id, equipo.codigo, equipo.nombre, equipo.ubicacion, equipo.marca, equipo.modelo].join(' ');
      return normalizarTexto(texto).includes(consulta);
    });
  }

  function filaHtml(equipo) {
    const idCompleto = equipo.id + (equipo.codigo ? ' · ' + equipo.codigo : '');
    return '<tr class="fila-equipo' + (equipo.id === seleccionado ? ' seleccionada' : '') + '" data-id="' + escaparHtml(equipo.id) + '" tabindex="0">' +
      '<td><div class="equipo-nombre">' + escaparHtml(equipo.nombre) + '</div><div class="equipo-id">' + escaparHtml(idCompleto) + '</div></td>' +
      '<td>' + escaparHtml(equipo.ubicacion) + '</td>' +
      '<td><div class="marca">' + escaparHtml(equipo.marca || '—') + '</div><div class="modelo">' + escaparHtml(equipo.modelo || '—') + '</div></td>' +
      '<td><span class="pill pill-crit-' + equipo.criticidad.toLowerCase() + '">' + equipo.criticidad + '</span></td>' +
      '<td><span class="pill pill-estado-' + equipo.estado + '">' + ESTADOS[equipo.estado] + '</span></td>' +
      '<td><button type="button" class="btn-qr" data-accion="qr" aria-label="Ver código QR de ' + escaparHtml(equipo.id) + '" title="Ver código QR">' + ICONO_QR + '</button></td>' +
      '<td><button type="button" class="btn-link" data-accion="editar">Editar</button></td>' +
      '</tr>';
  }

  function dibujarTabla() {
    const filtrados = equiposFiltrados();
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANO_PAGINA));
    paginaActual = Math.min(paginaActual, totalPaginas);
    const visibles = filtrados.slice((paginaActual - 1) * TAMANO_PAGINA, paginaActual * TAMANO_PAGINA);

    elementos.cuerpo.innerHTML = visibles.length
      ? visibles.map(filaHtml).join('')
      : '<tr><td class="estado-vacio" colspan="7">No se encontraron equipos con los filtros aplicados.</td></tr>';

    const totalEstado = filtroEstado === 'todos' ? conteos.total : conteos[filtroEstado];
    elementos.resumen.textContent = 'Mostrando ' + visibles.length + ' de ' + Math.max(totalEstado, filtrados.length) + ' equipos';
    dibujarPaginacion(elementos.paginacion, paginaActual, totalPaginas, function (pagina) {
      paginaActual = pagina;
      dibujarTabla();
    });
  }

  function buscarEquipo(id) {
    return equipos.find(function (equipo) { return equipo.id === id; });
  }

  function conectarTabla() {
    elementos.cuerpo.addEventListener('click', function (evento) {
      const fila = evento.target.closest('.fila-equipo');
      if (!fila) {
        return;
      }
      if (evento.target.closest('[data-accion="qr"]')) {
        irA('codigos qr', { buscar: fila.dataset.id });
        return;
      }
      abrirPanel('editar', buscarEquipo(fila.dataset.id));
    });
    elementos.cuerpo.addEventListener('keydown', function (evento) {
      const fila = evento.target.closest('.fila-equipo');
      if (fila && evento.target === fila && evento.key === 'Enter') {
        abrirPanel('editar', buscarEquipo(fila.dataset.id));
      }
    });

    document.querySelectorAll('.status-tabs .tab').forEach(function (pestana) {
      pestana.addEventListener('click', function () {
        filtroEstado = pestana.dataset.estado;
        document.querySelectorAll('.status-tabs .tab').forEach(function (otra) {
          const activa = otra === pestana;
          otra.classList.toggle('active', activa);
          otra.setAttribute('aria-pressed', activa ? 'true' : 'false');
        });
        paginaActual = 1;
        dibujarTabla();
      });
    });

    elementos.busqueda.addEventListener('input', function () {
      paginaActual = 1;
      dibujarTabla();
    });
    elementos.ubicacion.addEventListener('change', function () {
      paginaActual = 1;
      dibujarTabla();
    });
  }

  /* --------------------------- Panel de edición --------------------------- */

  function asegurarUbicacion(ubicacion) {
    const existe = Array.from(elementos.campoUbicacion.options).some(function (opcion) { return opcion.value === ubicacion; });
    if (!existe) {
      elementos.campoUbicacion.add(new Option(ubicacion, ubicacion));
      elementos.ubicacion.add(new Option(ubicacion, ubicacion));
    }
  }

  function mostrarError(mensaje) {
    elementos.error.textContent = mensaje;
    elementos.error.hidden = !mensaje;
    elementos.campoId.removeAttribute('aria-invalid');
    elementos.nombre.removeAttribute('aria-invalid');
  }

  function siguienteIdentificador() {
    let numero = conteos.total + 1;
    while (buscarEquipo('EQ-' + String(numero).padStart(3, '0'))) {
      numero += 1;
    }
    return 'EQ-' + String(numero).padStart(3, '0');
  }

  function llenarFormulario(equipo) {
    elementos.nombre.value = equipo.nombre;
    asegurarUbicacion(equipo.ubicacion);
    elementos.campoUbicacion.value = equipo.ubicacion;
    elementos.criticidad.value = equipo.criticidad;
    elementos.marca.value = equipo.marca || '';
    elementos.modelo.value = equipo.modelo || '';
    elementos.estado.value = equipo.estado;
  }

  function abrirPanel(modo, equipo, sinEnfocar) {
    modoPanel = modo;
    mostrarError('');
    elementos.panel.hidden = false;
    elementos.layout.classList.remove('sin-panel');

    if (modo === 'editar') {
      seleccionado = equipo.id;
      elementos.titulo.textContent = 'Editar equipo';
      elementos.subtitulo.textContent = 'Actualiza la ficha del activo seleccionado.';
      elementos.chipId.textContent = equipo.id;
      elementos.chipId.parentElement.hidden = false;
      elementos.ultimaEdicion.textContent = equipo.editado ? 'Última edición: hoy, ' + equipo.editado : 'Sin ediciones recientes';
      elementos.grupoId.hidden = true;
      elementos.guardar.textContent = 'Guardar';
      llenarFormulario(equipo);
    } else {
      seleccionado = null;
      elementos.titulo.textContent = 'Registrar equipo';
      elementos.subtitulo.textContent = 'Completa la ficha del activo. Al guardar se genera su código QR.';
      elementos.chipId.parentElement.hidden = true;
      elementos.grupoId.hidden = false;
      elementos.campoId.value = siguienteIdentificador();
      elementos.guardar.textContent = 'Registrar equipo';
      llenarFormulario({ nombre: '', ubicacion: elementos.campoUbicacion.options[0].value, criticidad: 'Media', marca: '', modelo: '', estado: 'operativo' });
    }
    dibujarTabla();
    if (!sinEnfocar) {
      (modo === 'nuevo' ? elementos.campoId : elementos.nombre).focus();
    }
  }

  function cerrarPanel() {
    seleccionado = null;
    elementos.panel.hidden = true;
    elementos.layout.classList.add('sin-panel');
    mostrarError('');
    dibujarTabla();
  }

  function guardarPanel(evento) {
    evento.preventDefault();
    const nombre = elementos.nombre.value.trim();
    if (!nombre) {
      mostrarError('Ingresa el nombre del equipo.');
      elementos.nombre.setAttribute('aria-invalid', 'true');
      elementos.nombre.focus();
      return;
    }

    if (modoPanel === 'nuevo') {
      const id = elementos.campoId.value.trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(id)) {
        mostrarError('El identificador solo puede tener letras, números, punto, guion y guion bajo.');
        elementos.campoId.setAttribute('aria-invalid', 'true');
        elementos.campoId.focus();
        return;
      }
      if (buscarEquipo(id)) {
        mostrarError('El identificador ' + id + ' ya está registrado. Usa uno distinto.');
        elementos.campoId.setAttribute('aria-invalid', 'true');
        elementos.campoId.focus();
        return;
      }
      const nuevo = {
        id: id,
        codigo: '',
        nombre: nombre,
        ubicacion: elementos.campoUbicacion.value,
        marca: elementos.marca.value.trim(),
        modelo: elementos.modelo.value.trim(),
        criticidad: elementos.criticidad.value,
        estado: elementos.estado.value,
        editado: horaActual()
      };
      equipos.unshift(nuevo);
      conteos.total += 1;
      conteos[nuevo.estado] += 1;
      filtroEstado = 'todos';
      document.querySelectorAll('.status-tabs .tab').forEach(function (pestana) {
        const activa = pestana.dataset.estado === 'todos';
        pestana.classList.toggle('active', activa);
        pestana.setAttribute('aria-pressed', activa ? 'true' : 'false');
      });
      elementos.busqueda.value = '';
      elementos.ubicacion.value = '';
      paginaActual = 1;
      actualizarIndicadores();
      abrirPanel('editar', nuevo);
      mostrarAviso('Equipo ' + id + ' registrado. Su código QR ya está disponible en Códigos QR.');
      return;
    }

    const equipo = buscarEquipo(seleccionado);
    if (conteos[equipo.estado] > 0) {
      conteos[equipo.estado] -= 1;
    }
    equipo.nombre = nombre;
    equipo.ubicacion = elementos.campoUbicacion.value;
    equipo.criticidad = elementos.criticidad.value;
    equipo.marca = elementos.marca.value.trim();
    equipo.modelo = elementos.modelo.value.trim();
    equipo.estado = elementos.estado.value;
    equipo.editado = horaActual();
    conteos[equipo.estado] += 1;
    actualizarIndicadores();
    abrirPanel('editar', equipo);
    mostrarAviso('Cambios guardados en ' + equipo.id + '. El identificador y el código QR no cambian.');
  }

  function horaActual() {
    return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function conectarPanel() {
    document.getElementById('btn-registrar').addEventListener('click', function () { abrirPanel('nuevo'); });
    document.getElementById('cerrar-panel').addEventListener('click', cerrarPanel);
    document.getElementById('cancelar-panel').addEventListener('click', function () {
      if (modoPanel === 'editar' && seleccionado) {
        abrirPanel('editar', buscarEquipo(seleccionado));
      } else {
        cerrarPanel();
      }
    });
    elementos.formulario.addEventListener('submit', guardarPanel);
    elementos.panel.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') {
        cerrarPanel();
      }
    });
  }

  /* ------------------------- Importación de planillas ------------------------- */

  // Lee un CSV separado por comas o punto y coma (admite comillas).
  function leerCsv(texto) {
    const limpio = texto.replace(/^\uFEFF/, '');
    const primeraLinea = limpio.split(/\r?\n/, 1)[0];
    const delimitador = (primeraLinea.match(/;/g) || []).length > (primeraLinea.match(/,/g) || []).length ? ';' : ',';
    const filas = [];
    let fila = [];
    let celda = '';
    let entreComillas = false;
    for (let i = 0; i < limpio.length; i += 1) {
      const c = limpio[i];
      if (entreComillas) {
        if (c === '"' && limpio[i + 1] === '"') {
          celda += '"';
          i += 1;
        } else if (c === '"') {
          entreComillas = false;
        } else {
          celda += c;
        }
      } else if (c === '"') {
        entreComillas = true;
      } else if (c === delimitador) {
        fila.push(celda);
        celda = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && limpio[i + 1] === '\n') {
          i += 1;
        }
        fila.push(celda);
        filas.push(fila);
        fila = [];
        celda = '';
      } else {
        celda += c;
      }
    }
    if (celda !== '' || fila.length) {
      fila.push(celda);
      filas.push(fila);
    }
    return filas.filter(function (f) { return f.some(function (c) { return c.trim() !== ''; }); });
  }

  const COLUMNAS = {
    identificador: 'id', id: 'id', nombre: 'nombre', ubicacion: 'ubicacion', area: 'ubicacion',
    marca: 'marca', modelo: 'modelo', criticidad: 'criticidad', estado: 'estado'
  };

  function estadoDesdeTexto(texto) {
    const valor = normalizarTexto(texto);
    if (!valor || valor === 'operativo') { return 'operativo'; }
    if (valor === 'en mantenimiento' || valor === 'mantenimiento') { return 'en_mantenimiento'; }
    if (valor === 'fuera de servicio') { return 'fuera_de_servicio'; }
    return null;
  }

  function criticidadDesdeTexto(texto) {
    const valor = normalizarTexto(texto);
    if (!valor) { return 'Media'; }
    return { alta: 'Alta', media: 'Media', baja: 'Baja' }[valor] || null;
  }

  // Valida la planilla: separa las filas válidas de las que tienen observaciones.
  function analizarPlanilla(filas) {
    const columnas = filas[0].map(function (titulo) { return COLUMNAS[normalizarTexto(titulo)] || null; });
    if (columnas.indexOf('id') === -1 || columnas.indexOf('nombre') === -1) {
      return null;
    }
    const validas = [];
    const observaciones = [];
    const idsEnArchivo = new Set();
    filas.slice(1).forEach(function (celdas, indice) {
      const numero = indice + 2;
      const dato = {};
      columnas.forEach(function (columna, posicion) {
        if (columna) { dato[columna] = (celdas[posicion] || '').trim(); }
      });
      const id = (dato.id || '').toUpperCase();
      const problemas = [];
      if (!id) {
        problemas.push('falta el identificador');
      } else if (buscarEquipo(id) || idsEnArchivo.has(id)) {
        problemas.push('el identificador ' + id + ' está duplicado');
      }
      if (!dato.nombre) { problemas.push('falta el nombre'); }
      const estado = estadoDesdeTexto(dato.estado || '');
      const criticidad = criticidadDesdeTexto(dato.criticidad || '');
      if (!estado) { problemas.push('el estado «' + dato.estado + '» no es válido'); }
      if (!criticidad) { problemas.push('la criticidad «' + dato.criticidad + '» no es válida'); }
      if (problemas.length) {
        observaciones.push('Fila ' + numero + ': ' + problemas.join(', ') + '.');
        return;
      }
      idsEnArchivo.add(id);
      validas.push({
        id: id, codigo: '', nombre: dato.nombre, ubicacion: dato.ubicacion || 'Sin ubicación',
        marca: dato.marca || '', modelo: dato.modelo || '', criticidad: criticidad, estado: estado, editado: null
      });
    });
    return { validas: validas, observaciones: observaciones, total: filas.length - 1 };
  }

  function mostrarResumenImportacion(resultado) {
    const resumen = document.getElementById('resumen-importacion');
    const lista = document.getElementById('observaciones-importacion');
    const confirmar = document.getElementById('confirmar-importacion');
    resumen.textContent = 'Se leyeron ' + resultado.total + ' filas: ' + resultado.validas.length + ' válidas y ' +
      resultado.observaciones.length + ' con observaciones.';
    lista.innerHTML = resultado.observaciones.slice(0, 6).map(function (texto) {
      return '<li>' + escaparHtml(texto) + '</li>';
    }).join('') + (resultado.observaciones.length > 6
      ? '<li>y ' + (resultado.observaciones.length - 6) + ' observaciones más.</li>' : '');
    confirmar.hidden = resultado.validas.length === 0;
    confirmar.textContent = 'Importar ' + resultado.validas.length + (resultado.validas.length === 1 ? ' fila válida' : ' filas válidas');
    importacionPendiente = resultado.validas;
    elementos.dialogo.showModal();
  }

  function confirmarImportacion() {
    importacionPendiente.forEach(function (equipo) {
      asegurarUbicacion(equipo.ubicacion);
      equipos.push(equipo);
      conteos.total += 1;
      conteos[equipo.estado] += 1;
    });
    const cantidad = importacionPendiente.length;
    importacionPendiente = [];
    elementos.dialogo.close();
    actualizarIndicadores();
    dibujarTabla();
    mostrarAviso(cantidad + (cantidad === 1 ? ' equipo importado' : ' equipos importados') + ' con su identificador y su código QR.');
  }

  function conectarImportacion() {
    document.getElementById('btn-importar').addEventListener('click', function () {
      elementos.archivo.value = '';
      elementos.archivo.click();
    });
    elementos.archivo.addEventListener('change', function () {
      const archivo = elementos.archivo.files[0];
      if (!archivo) {
        return;
      }
      if (!/\.csv$/i.test(archivo.name)) {
        mostrarAviso('Guarda la planilla como CSV (Archivo › Guardar como › CSV) para importarla.');
        return;
      }
      const lector = new FileReader();
      lector.addEventListener('load', function () {
        const filas = leerCsv(String(lector.result));
        const resultado = filas.length > 1 ? analizarPlanilla(filas) : null;
        if (!resultado) {
          mostrarAviso('La planilla necesita una fila de títulos con las columnas identificador y nombre, y al menos un equipo.');
          return;
        }
        mostrarResumenImportacion(resultado);
      });
      lector.readAsText(archivo);
    });
    document.getElementById('cancelar-importacion').addEventListener('click', function () {
      importacionPendiente = [];
      elementos.dialogo.close();
    });
    document.getElementById('confirmar-importacion').addEventListener('click', confirmarImportacion);
  }

  /* ----------------------------- Búsqueda recibida ----------------------------- */

  function buscarDesdeTexto(texto) {
    elementos.busqueda.value = texto;
    paginaActual = 1;
    dibujarTabla();
    elementos.busqueda.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function iniciarEquipos() {
    actualizarIndicadores();
    conectarTabla();
    conectarPanel();
    conectarImportacion();

    // Búsqueda recibida desde otra página (?buscar=...).
    const recibida = new URLSearchParams(window.location.search).get('buscar');
    if (recibida) {
      elementos.busqueda.value = recibida;
    }
    dibujarTabla();

    // Al abrir la página queda seleccionado el primer equipo, como en el diseño.
    const inicial = equiposFiltrados()[0] || equipos[0];
    abrirPanel('editar', inicial, true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    conectarMenuLateral();
    conectarBusquedaGlobal(function (texto) { buscarDesdeTexto(texto); });
    mostrarHoraActual();
    iniciarEquipos();
  });
})();