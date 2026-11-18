/**
 * CodigoQR.js
 * Conecta la página «Códigos QR» con el resto de las páginas del sitio web.
 *
 * - Menú lateral: navega entre las secciones y marca la sección activa.
 * - Etiquetas: genera un código QR real por equipo («MANTTO:» + identificador), con filtros,
 *   paginación y vista previa (también con ?buscar=EQ-004 desde Equipos).
 * - Descargar / Imprimir: abre el cuadro de impresión con las etiquetas elegidas (A6 o A4);
 *   allí se puede escoger «Guardar como PDF».
 */
(function () {
  'use strict';

  // Sección que representa esta página en el menú lateral.
  const PAGINA_ACTUAL = 'codigos qr';

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

  /* --------------------------- Generador de códigos QR --------------------------- */
  // Codificador QR propio (modo byte, corrección de errores M, versiones 1 a 6).
  // No depende de librerías externas, por lo que funciona también sin conexión.
  // Devuelve una matriz de booleanos (true = módulo oscuro) o null si el texto es demasiado largo.

  // Por versión: [bloques, datos por bloque, códigos de corrección por bloque].
  const QR_BLOQUES = {
    1: [1, 16, 10],
    2: [1, 28, 16],
    3: [1, 44, 26],
    4: [2, 32, 18],
    5: [2, 43, 24],
    6: [4, 27, 16]
  };
  const QR_ALINEACION = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

  // Aritmética de Galois GF(256) con el polinomio 0x11D.
  const GF_EXP = new Array(512);
  const GF_LOG = new Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) {
        x ^= 0x11D;
      }
    }
    for (let i = 255; i < 512; i += 1) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMultiplicar(a, b) {
    return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function restoReedSolomon(datos, cantidadEc) {
    let generador = [1];
    for (let i = 0; i < cantidadEc; i += 1) {
      const siguiente = new Array(generador.length + 1).fill(0);
      for (let j = 0; j < generador.length; j += 1) {
        siguiente[j] ^= generador[j];
        siguiente[j + 1] ^= gfMultiplicar(generador[j], GF_EXP[i]);
      }
      generador = siguiente;
    }
    const resto = new Array(cantidadEc).fill(0);
    datos.forEach(function (byte) {
      const factor = byte ^ resto.shift();
      resto.push(0);
      for (let i = 0; i < cantidadEc; i += 1) {
        resto[i] ^= gfMultiplicar(generador[i + 1], factor);
      }
    });
    return resto;
  }

  function crearMatrizQR(texto) {
    const bytes = Array.from(new TextEncoder().encode(texto));

    // Versión más pequeña que contiene el texto (4 bits de modo + 8 de largo = 2 bytes de cabecera).
    let version = 0;
    for (let v = 1; v <= 6; v += 1) {
      const info = QR_BLOQUES[v];
      if (bytes.length <= info[0] * info[1] - 2) {
        version = v;
        break;
      }
    }
    if (!version) {
      return null;
    }
    const bloques = QR_BLOQUES[version][0];
    const datosPorBloque = QR_BLOQUES[version][1];
    const ecPorBloque = QR_BLOQUES[version][2];
    const totalDatos = bloques * datosPorBloque;

    // 1. Bits de datos: modo byte (0100), largo, contenido, terminador y relleno.
    const bits = [];
    function agregar(valor, largo) {
      for (let i = largo - 1; i >= 0; i -= 1) {
        bits.push((valor >>> i) & 1);
      }
    }
    agregar(4, 4);
    agregar(bytes.length, 8);
    bytes.forEach(function (byte) { agregar(byte, 8); });
    agregar(0, Math.min(4, totalDatos * 8 - bits.length));
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }
    const codigos = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j += 1) {
        byte = (byte << 1) | bits[i + j];
      }
      codigos.push(byte);
    }
    for (let relleno = 0xEC; codigos.length < totalDatos; relleno ^= 0xEC ^ 0x11) {
      codigos.push(relleno);
    }

    // 2. Bloques con corrección de errores, entrelazados.
    const bloquesDatos = [];
    const bloquesEc = [];
    for (let b = 0; b < bloques; b += 1) {
      const datos = codigos.slice(b * datosPorBloque, (b + 1) * datosPorBloque);
      bloquesDatos.push(datos);
      bloquesEc.push(restoReedSolomon(datos, ecPorBloque));
    }
    const mensaje = [];
    for (let i = 0; i < datosPorBloque; i += 1) {
      bloquesDatos.forEach(function (bloque) { mensaje.push(bloque[i]); });
    }
    for (let i = 0; i < ecPorBloque; i += 1) {
      bloquesEc.forEach(function (bloque) { mensaje.push(bloque[i]); });
    }

    // 3. Matriz con los patrones fijos.
    const tamano = 17 + 4 * version;
    const modulos = [];
    const fijo = [];
    for (let y = 0; y < tamano; y += 1) {
      modulos.push(new Array(tamano).fill(false));
      fijo.push(new Array(tamano).fill(false));
    }
    function fijar(x, y, oscuro) {
      modulos[y][x] = oscuro;
      fijo[y][x] = true;
    }
    function dibujarBuscador(cx, cy) {
      for (let dy = -4; dy <= 4; dy += 1) {
        for (let dx = -4; dx <= 4; dx += 1) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < tamano && y >= 0 && y < tamano) {
            const distancia = Math.max(Math.abs(dx), Math.abs(dy));
            fijar(x, y, distancia !== 2 && distancia !== 4);
          }
        }
      }
    }
    for (let i = 0; i < tamano; i += 1) {
      fijar(6, i, i % 2 === 0);
      fijar(i, 6, i % 2 === 0);
    }
    dibujarBuscador(3, 3);
    dibujarBuscador(tamano - 4, 3);
    dibujarBuscador(3, tamano - 4);
    const posiciones = QR_ALINEACION[version];
    posiciones.forEach(function (py, i) {
      posiciones.forEach(function (px, j) {
        const enEsquina = (i === 0 && j === 0) ||
          (i === 0 && j === posiciones.length - 1) ||
          (i === posiciones.length - 1 && j === 0);
        if (enEsquina) {
          return;
        }
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            fijar(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      });
    });

    // Información de formato (nivel M = 00 y máscara).
    function dibujarFormato(mascara) {
      const datos = mascara; // nivel M: bits 00
      let resto = datos;
      for (let i = 0; i < 10; i += 1) {
        resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
      }
      const formato = ((datos << 10) | resto) ^ 0x5412;
      function bit(i) { return ((formato >>> i) & 1) !== 0; }
      for (let i = 0; i <= 5; i += 1) { fijar(8, i, bit(i)); }
      fijar(8, 7, bit(6));
      fijar(8, 8, bit(7));
      fijar(7, 8, bit(8));
      for (let i = 9; i < 15; i += 1) { fijar(14 - i, 8, bit(i)); }
      for (let i = 0; i < 8; i += 1) { fijar(tamano - 1 - i, 8, bit(i)); }
      for (let i = 8; i < 15; i += 1) { fijar(8, tamano - 15 + i, bit(i)); }
      fijar(8, tamano - 8, true);
    }
    dibujarFormato(0);

    // 4. Colocación de los datos en zigzag.
    let indice = 0;
    for (let derecha = tamano - 1; derecha >= 1; derecha -= 2) {
      if (derecha === 6) {
        derecha = 5;
      }
      for (let vertical = 0; vertical < tamano; vertical += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = derecha - j;
          const haciaArriba = ((derecha + 1) & 2) === 0;
          const y = haciaArriba ? tamano - 1 - vertical : vertical;
          if (!fijo[y][x] && indice < mensaje.length * 8) {
            modulos[y][x] = ((mensaje[indice >>> 3] >>> (7 - (indice & 7))) & 1) !== 0;
            indice += 1;
          }
        }
      }
    }

    // 5. Máscara con menor penalización.
    function invierte(mascara, x, y) {
      switch (mascara) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
        case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
        default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
    }
    function aplicarMascara(mascara) {
      for (let y = 0; y < tamano; y += 1) {
        for (let x = 0; x < tamano; x += 1) {
          if (!fijo[y][x] && invierte(mascara, x, y)) {
            modulos[y][x] = !modulos[y][x];
          }
        }
      }
    }
    function penalizacion() {
      let total = 0;
      function evaluarLinea(valor) {
        let racha = 1;
        for (let i = 1; i < tamano; i += 1) {
          if (valor(i) === valor(i - 1)) {
            racha += 1;
            if (racha === 5) { total += 3; } else if (racha > 5) { total += 1; }
          } else {
            racha = 1;
          }
        }
        // Patrón parecido a un buscador (1:1:3:1:1) con cuatro módulos claros a un lado.
        const patron = [true, false, true, true, true, false, true];
        for (let i = 0; i + 7 <= tamano; i += 1) {
          if (patron.every(function (p, k) { return valor(i + k) === p; })) {
            const claroAntes = i >= 4 && [1, 2, 3, 4].every(function (k) { return !valor(i - k); });
            const claroDespues = i + 11 <= tamano && [7, 8, 9, 10].every(function (k) { return !valor(i + k); });
            if (claroAntes || claroDespues) { total += 40; }
          }
        }
      }
      for (let y = 0; y < tamano; y += 1) { evaluarLinea(function (i) { return modulos[y][i]; }); }
      for (let x = 0; x < tamano; x += 1) { evaluarLinea(function (i) { return modulos[i][x]; }); }
      for (let y = 0; y < tamano - 1; y += 1) {
        for (let x = 0; x < tamano - 1; x += 1) {
          const c = modulos[y][x];
          if (c === modulos[y][x + 1] && c === modulos[y + 1][x] && c === modulos[y + 1][x + 1]) { total += 3; }
        }
      }
      let oscuros = 0;
      modulos.forEach(function (fila) { fila.forEach(function (m) { if (m) { oscuros += 1; } }); });
      const porcentaje = (oscuros * 100) / (tamano * tamano);
      total += Math.floor(Math.abs(porcentaje - 50) / 5) * 10;
      return total;
    }
    let mejorMascara = 0;
    let mejorPuntaje = Infinity;
    for (let m = 0; m < 8; m += 1) {
      aplicarMascara(m);
      dibujarFormato(m);
      const puntaje = penalizacion();
      if (puntaje < mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejorMascara = m;
      }
      aplicarMascara(m); // deshace la máscara
    }
    aplicarMascara(mejorMascara);
    dibujarFormato(mejorMascara);
    return modulos;
  }

  // SVG de un código QR (con margen blanco de 2 módulos). Devuelve '' si el texto no cabe.
  function svgQR(texto) {
    const matriz = crearMatrizQR(texto);
    if (!matriz) {
      return '';
    }
    const margen = 2;
    const lado = matriz.length + margen * 2;
    let trazo = '';
    matriz.forEach(function (fila, y) {
      fila.forEach(function (oscuro, x) {
        if (oscuro) {
          trazo += 'M' + (x + margen) + ' ' + (y + margen) + 'h1v1h-1z';
        }
      });
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + lado + ' ' + lado + '" ' +
      'shape-rendering="crispEdges" role="img" aria-label="Código QR de ' + escaparHtml(texto) + '">' +
      '<rect width="' + lado + '" height="' + lado + '" fill="#FFFFFF"/>' +
      '<path d="' + trazo + '" fill="#142C32"/></svg>';
  }

  /* --------------------------------- Datos --------------------------------- */

  // Contenido codificado en cada QR: «MANTTO:» seguido del identificador único del equipo.
  const PREFIJO_QR = 'MANTTO:';
  const TAMANO_PAGINA = 6;

  const TIPOS = [
    { nombre: 'Bomba centrífuga', letra: 'B' },
    { nombre: 'Compresor', letra: 'C' },
    { nombre: 'Motor eléctrico', letra: 'M' },
    { nombre: 'Ventilador', letra: 'V' },
    { nombre: 'Reductor', letra: 'R' },
    { nombre: 'Banda transportadora', letra: 'T' },
    { nombre: 'Bomba de vacío', letra: 'B' }
  ];
  const UBICACIONES = ['Línea 01', 'Línea 02', 'Línea 03', 'Sala de aire', 'Área de secado', 'Empaque'];
  const TOTAL_EQUIPOS = 128;
  // Equipos que encabezan la lista (numeración del equipo, tipo, ubicación e impresión).
  const DESTACADOS = [
    { n: 4, tipo: 0, ubicacion: 'Línea 02', impresa: true },
    { n: 12, tipo: 1, ubicacion: 'Sala de aire', impresa: false },
    { n: 8, tipo: 2, ubicacion: 'Línea 01', impresa: true },
    { n: 21, tipo: 6, ubicacion: 'Línea 03', impresa: false },
    { n: 16, tipo: 3, ubicacion: 'Área de secado', impresa: true },
    { n: 32, tipo: 4, ubicacion: 'Línea 02', impresa: true }
  ];

  function crearEtiqueta(n, tipo, ubicacion, impresa) {
    const codigo = TIPOS[tipo].letra + '-' + String(n).padStart(2, '0');
    return {
      id: 'EQ-' + String(n).padStart(3, '0'),
      nombre: TIPOS[tipo].nombre + ' ' + codigo,
      codigo: codigo,
      ubicacion: ubicacion,
      impresa: impresa
    };
  }

  // Etiquetas de ejemplo de los 128 equipos de Planta Norte.
  // Los equipos EQ-099 a EQ-128 (los más recientes) aún no se imprimen.
  const etiquetas = (function () {
    const lista = DESTACADOS.map(function (d) { return crearEtiqueta(d.n, d.tipo, d.ubicacion, d.impresa); });
    const usados = DESTACADOS.map(function (d) { return d.n; });
    for (let n = 1; n <= TOTAL_EQUIPOS; n += 1) {
      if (usados.indexOf(n) === -1) {
        lista.push(crearEtiqueta(n, n % TIPOS.length, UBICACIONES[(n * 5) % UBICACIONES.length], n < 99));
      }
    }
    return lista;
  })();

  const FORMATOS = {
    a6: { texto: 'A6 · 105 × 148 mm', porHoja: 1, pagina: '105mm 148mm' },
    a4: { texto: 'A4 · 4 etiquetas A6', porHoja: 4, pagina: 'A4' }
  };

  let filtroImpresion = 'todas';   // 'todas' o 'pendientes'
  let paginaActual = 1;
  let activa = etiquetas[0].id;    // etiqueta de la vista previa
  const marcadas = new Set();      // etiquetas marcadas con la casilla
  const cacheQR = {};

  const elementos = {
    selectEquipos: document.getElementById('filtro-equipos'),
    selectFormato: document.getElementById('formato-descarga'),
    grid: document.getElementById('grid-etiquetas'),
    resumen: document.getElementById('resumen-etiquetas'),
    paginacion: document.getElementById('paginacion-etiquetas'),
    vistaPrevia: document.getElementById('area-vista-previa'),
    chipFormato: document.getElementById('chip-formato'),
    textoDescargar: document.getElementById('texto-descargar'),
    zonaImpresion: document.getElementById('zona-impresion'),
    estiloPagina: document.getElementById('estilo-pagina')
  };

  /* ------------------------------ Etiquetas ------------------------------ */

  function qrDe(etiqueta) {
    if (!cacheQR[etiqueta.id]) {
      cacheQR[etiqueta.id] = svgQR(PREFIJO_QR + etiqueta.id);
    }
    return cacheQR[etiqueta.id];
  }

  function etiquetaHtml(etiqueta) {
    return '<div class="etiqueta">' +
      '<div class="etiqueta-cabecera"><span class="etiqueta-marca">MANTTO</span><span class="etiqueta-planta">PLANTA NORTE</span></div>' +
      '<div class="etiqueta-qr">' + qrDe(etiqueta) + '</div>' +
      '<div class="etiqueta-datos"><strong>' + escaparHtml(etiqueta.nombre) + '</strong>' +
      '<span>' + escaparHtml(etiqueta.id + ' · ' + etiqueta.ubicacion) + '</span>' +
      '<small>Escanea para consultar la ficha del equipo</small></div></div>';
  }

  function etiquetaPorId(id) {
    return etiquetas.find(function (etiqueta) { return etiqueta.id === id; });
  }

  // Etiquetas que cumplen los filtros de zona y de impresión.
  function etiquetasFiltradas() {
    const ubicacion = elementos.selectEquipos.value;
    return etiquetas.filter(function (etiqueta) {
      return (!ubicacion || etiqueta.ubicacion === ubicacion) &&
        (filtroImpresion === 'todas' || !etiqueta.impresa);
    });
  }

  // Etiquetas que se descargan: las marcadas o, si no hay, todas las del filtro.
  function etiquetasADescargar() {
    if (marcadas.size) {
      return etiquetas.filter(function (etiqueta) { return marcadas.has(etiqueta.id); });
    }
    return etiquetasFiltradas();
  }

  function cardHtml(etiqueta) {
    const esActiva = etiqueta.id === activa;
    return '<article class="etiqueta-card' + (esActiva ? ' activa' : '') + '" data-id="' + etiqueta.id + '" tabindex="0"' +
      (esActiva ? ' aria-current="true"' : '') + '>' +
      '<div class="card-superior">' +
      '<label class="card-seleccion"><input type="checkbox" data-accion="marcar"' + (marcadas.has(etiqueta.id) ? ' checked' : '') +
      ' aria-label="Marcar la etiqueta de ' + escaparHtml(etiqueta.nombre) + '"></label>' +
      '<span class="pill-impresion ' + (etiqueta.impresa ? 'impresa">Impresa' : 'pendiente">Pendiente') + '</span></div>' +
      '<div class="qr-mini">' + qrDe(etiqueta) + '</div>' +
      '<h4 class="card-nombre">' + escaparHtml(etiqueta.nombre) + '</h4>' +
      '<div class="card-datos"><span>' + etiqueta.id + '</span><span>' + escaparHtml(etiqueta.ubicacion) + '</span></div>' +
      '<div class="card-pie"><strong>MANTTO</strong><span>Planta Norte</span></div></article>';
  }

  function dibujarGrid() {
    const filtradas = etiquetasFiltradas();
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / TAMANO_PAGINA));
    paginaActual = Math.min(paginaActual, totalPaginas);
    const visibles = filtradas.slice((paginaActual - 1) * TAMANO_PAGINA, paginaActual * TAMANO_PAGINA);

    elementos.grid.innerHTML = visibles.length
      ? visibles.map(cardHtml).join('')
      : '<p class="sin-etiquetas">No hay etiquetas con los filtros aplicados.</p>';
    elementos.resumen.textContent = 'Mostrando ' + visibles.length + ' de ' + filtradas.length + ' etiquetas';
    dibujarPaginacion(elementos.paginacion, paginaActual, totalPaginas, function (pagina) {
      paginaActual = pagina;
      dibujarGrid();
    });
    actualizarTextoDescarga();
  }

  function actualizarTextoDescarga() {
    const cantidad = etiquetasADescargar().length;
    elementos.textoDescargar.textContent = 'Descargar ' + cantidad + (cantidad === 1 ? ' código' : ' códigos');
    document.getElementById('btn-descargar-todos').disabled = cantidad === 0;
  }

  function actualizarContadores() {
    const impresas = etiquetas.filter(function (etiqueta) { return etiqueta.impresa; }).length;
    document.getElementById('n-impresas').textContent = impresas;
    document.getElementById('n-pendientes').textContent = etiquetas.length - impresas;
    document.getElementById('contador-todas').textContent = etiquetas.length;
    document.getElementById('contador-pendientes').textContent = etiquetas.length - impresas;
    document.getElementById('chip-total').textContent = etiquetas.length + ' códigos';

    // Opciones de zona con la cantidad de equipos de cada una.
    let opciones = '<option value="">Todos los equipos (' + etiquetas.length + ')</option>';
    UBICACIONES.forEach(function (ubicacion) {
      const cantidad = etiquetas.filter(function (etiqueta) { return etiqueta.ubicacion === ubicacion; }).length;
      opciones += '<option value="' + escaparHtml(ubicacion) + '">' + escaparHtml(ubicacion) + ' (' + cantidad + ')</option>';
    });
    elementos.selectEquipos.innerHTML = opciones;
  }

  /* ----------------------------- Vista previa ----------------------------- */

  function dibujarVistaPrevia() {
    const etiqueta = etiquetaPorId(activa);
    elementos.vistaPrevia.innerHTML = etiquetaHtml(etiqueta);
    elementos.chipFormato.textContent = FORMATOS[elementos.selectFormato.value].texto;
  }

  function seleccionarEtiqueta(id) {
    activa = id;
    dibujarVistaPrevia();
    document.querySelectorAll('.etiqueta-card').forEach(function (card) {
      const esActiva = card.dataset.id === id;
      card.classList.toggle('activa', esActiva);
      if (esActiva) {
        card.setAttribute('aria-current', 'true');
      } else {
        card.removeAttribute('aria-current');
      }
    });
  }

  /* -------------------------- Impresión y descarga -------------------------- */

  // Abre el cuadro de impresión con las etiquetas indicadas; allí se puede elegir «Guardar como PDF».
  function imprimirEtiquetas(lista, mensaje) {
    if (!lista.length) {
      return;
    }
    const formato = elementos.selectFormato.value;
    const porHoja = FORMATOS[formato].porHoja;
    let html = '';
    for (let i = 0; i < lista.length; i += porHoja) {
      html += '<div class="hoja hoja-' + formato + '">' + lista.slice(i, i + porHoja).map(etiquetaHtml).join('') + '</div>';
    }
    elementos.zonaImpresion.innerHTML = html;
    elementos.estiloPagina.textContent = '@page { size: ' + FORMATOS[formato].pagina + '; margin: 0; }';
    document.body.classList.add('imprimiendo');
    if (mensaje) {
      mostrarAviso(mensaje);
    }
    // Pequeña pausa para que el aviso alcance a verse antes de abrir el cuadro de impresión.
    setTimeout(function () { window.print(); }, 250);
  }

  function limpiarImpresion() {
    document.body.classList.remove('imprimiendo');
    elementos.zonaImpresion.innerHTML = '';
  }

  const AVISO_PDF = 'En el cuadro de impresión elige «Guardar como PDF» e imprime al 100 %.';

  /* ------------------------------- Eventos ------------------------------- */

  function conectarEventos() {
    elementos.grid.addEventListener('click', function (evento) {
      const card = evento.target.closest('.etiqueta-card');
      if (!card) {
        return;
      }
      if (evento.target.closest('.card-seleccion')) {
        if (evento.target.matches('input')) {
          if (evento.target.checked) {
            marcadas.add(card.dataset.id);
          } else {
            marcadas.delete(card.dataset.id);
          }
          actualizarTextoDescarga();
        }
        return;
      }
      seleccionarEtiqueta(card.dataset.id);
    });
    elementos.grid.addEventListener('keydown', function (evento) {
      const card = evento.target.closest('.etiqueta-card');
      if (card && evento.target === card && (evento.key === 'Enter' || evento.key === ' ')) {
        evento.preventDefault();
        seleccionarEtiqueta(card.dataset.id);
      }
    });

    document.querySelectorAll('.chip-filtro').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filtroImpresion = chip.dataset.filtro;
        document.querySelectorAll('.chip-filtro').forEach(function (otro) {
          const esActivo = otro === chip;
          otro.classList.toggle('active', esActivo);
          otro.setAttribute('aria-pressed', esActivo ? 'true' : 'false');
        });
        paginaActual = 1;
        dibujarGrid();
      });
    });

    elementos.selectEquipos.addEventListener('change', function () {
      paginaActual = 1;
      dibujarGrid();
    });
    elementos.selectFormato.addEventListener('change', dibujarVistaPrevia);

    document.getElementById('btn-descargar-todos').addEventListener('click', function () {
      imprimirEtiquetas(etiquetasADescargar(), AVISO_PDF);
    });
    document.getElementById('btn-descargar-pdf').addEventListener('click', function () {
      imprimirEtiquetas([etiquetaPorId(activa)], AVISO_PDF);
    });
    document.getElementById('btn-imprimir').addEventListener('click', function () {
      imprimirEtiquetas([etiquetaPorId(activa)]);
    });
    window.addEventListener('afterprint', limpiarImpresion);
  }

  // Muestra la etiqueta indicada en la página ?buscar=... (por ejemplo, desde el ícono QR de Equipos).
  function abrirEtiquetaBuscada(texto) {
    const consulta = normalizarTexto(texto);
    const indice = etiquetas.findIndex(function (etiqueta) {
      return normalizarTexto(etiqueta.id) === consulta || normalizarTexto(etiqueta.nombre).includes(consulta);
    });
    if (indice === -1) {
      mostrarAviso('Aún no hay una etiqueta para «' + texto + '».');
      return;
    }
    filtroImpresion = 'todas';
    elementos.selectEquipos.value = '';
    paginaActual = Math.floor(indice / TAMANO_PAGINA) + 1;
    activa = etiquetas[indice].id;
  }

  function iniciarCodigosQR() {
    actualizarContadores();
    const recibida = new URLSearchParams(window.location.search).get('buscar');
    if (recibida) {
      abrirEtiquetaBuscada(recibida);
    }
    conectarEventos();
    dibujarGrid();
    dibujarVistaPrevia();
  }

  document.addEventListener('DOMContentLoaded', function () {
    conectarMenuLateral();
    conectarBusquedaGlobal(function (texto) { abrirEtiquetaBuscada(texto); dibujarGrid(); dibujarVistaPrevia(); });
    mostrarHoraActual();
    iniciarCodigosQR();
  });
})();