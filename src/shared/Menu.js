/**
 * menu.js — Menú lateral único para todas las páginas de src/pages/WebSite/.
 * Se carga en el <head> de cada página, antes de los scripts propios.
 * Reemplaza el <aside>/.sidebar existente y marca la sección activa según la carpeta.
 */
(function () {
  'use strict';

  const MENU = [
    {
      titulo: 'OPERACIÓN',
      items: [
        { texto: 'Dashboard', carpeta: 'Dashboard', archivo: 'Dashboard.html' },
        { texto: 'Equipos', carpeta: 'Equipos', archivo: 'Equipos.html' },
        { texto: 'Órdenes de trabajo', carpeta: 'OrdenTrabajo', archivo: 'OrdenTrabajo.html' },
        { texto: 'Inventario', carpeta: 'Inventario', archivo: 'Inventario.html' },
        { texto: 'Códigos QR', carpeta: 'CodigoQR', archivo: 'CodigoQR.html' },
        { texto: 'Reportes', carpeta: 'ReportesAnaliticos', archivo: 'ReportesAnaliticos.html' }
      ]
    },
    {
      titulo: 'ADMINISTRACIÓN',
      items: [
        { texto: 'Configuración', carpeta: 'ConfUsers', archivo: 'ConfUsers.html' },
        { texto: 'Centro de ayuda', carpeta: 'CentroAyuda', archivo: 'CentroAyuda.html' }
      ]
    }
  ];

  const ICONO = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="2"/></svg>';

  const ESTILO = `
    .mt-sidebar{width:232px;flex-shrink:0;height:100vh;position:sticky;top:0;overflow-y:auto;
      background:#142C32;color:#fff;display:flex;flex-direction:column;padding:28px 12px 16px;font-family:Inter,system-ui,sans-serif}
    .mt-brand{color:#D5F66A;font-size:28px;font-weight:700;padding-left:12px;line-height:1.1}
    .mt-sub{display:block;color:#C4D0CE;font-size:9px;letter-spacing:1.5px;margin:6px 0 0 12px}
    .mt-title{display:block;font-size:10px;font-weight:600;letter-spacing:1.4px;color:#A9BFBC;padding-left:12px;margin:24px 0 10px}
    .mt-nav{display:flex;flex-direction:column;gap:6px}
    .mt-item{display:flex;align-items:center;gap:10px;padding:11px 10px;border-radius:8px;color:#E5EEEA;font-size:12.5px;font-weight:500;text-decoration:none;white-space:nowrap}
    .mt-item:hover{background:#294349}
    .mt-item.activo{background:#D5F66A;color:#142C32;font-weight:600}
    .mt-sesion{margin-top:auto;background:#294349;border-radius:8px;padding:11px 12px;font-size:10px;color:#ABC0BA}
  `;

  function carpetaActual() {
    const partes = location.pathname.split('/').filter(Boolean);
    return partes.length >= 2 ? partes[partes.length - 2] : '';
  }

  function construirMenu() {
    const actual = carpetaActual();
    const secciones = MENU.map(function (s) {
      const enlaces = s.items.map(function (it) {
        const clase = 'mt-item' + (it.carpeta === actual ? ' activo' : '');
        const marca = it.carpeta === actual ? ' aria-current="page"' : '';
        return '<a class="' + clase + '" href="../' + it.carpeta + '/' + it.archivo + '"' + marca + '>' +
          ICONO + '<span>' + it.texto + '</span></a>';
      }).join('');
      return '<span class="mt-title">' + s.titulo + '</span><nav class="mt-nav">' + enlaces + '</nav>';
    }).join('');

    return '<aside class="mt-sidebar" id="mt-sidebar">' +
      '<div class="mt-brand">MANTTO</div>' +
      '<span class="mt-sub">SUPERVISIÓN INDUSTRIAL</span>' +
      secciones +
      '<div class="mt-sesion" id="mt-sesion">Sesión: sin iniciar</div>' +
      '</aside>';
  }

  function montar() {
    const estilo = document.createElement('style');
    estilo.textContent = ESTILO;
    document.head.appendChild(estilo);

    // Quita el menú antiguo de cada página (<aside> o .sidebar).
    document.querySelectorAll('aside, .sidebar').forEach(function (viejo) { viejo.remove(); });

    const contenedor = document.createElement('div');
    contenedor.innerHTML = construirMenu();
    document.body.insertBefore(contenedor.firstElementChild, document.body.firstChild);
  }

  // Expuesto para que las páginas puedan mostrar el usuario con sesión.
  window.manttoMenu = { montar: montar };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
})();