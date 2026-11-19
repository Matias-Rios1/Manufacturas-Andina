/**
 * InicioSesion.js
 * Lógica de la pantalla «Iniciar sesión» de la app móvil.
 *
 * - Valida el formulario e inicia sesión con correo y contraseña (CA-1-6, RNF-3).
 * - Carga el perfil del usuario (rol) y lo guarda para trabajar sin conexión.
 * - Muestra/oculta la contraseña y envía el correo de recuperación.
 */
(function () {
  'use strict';

  const M = window.Mantto;
  const formulario = document.querySelector('.login-form');
  const campoCorreo = document.getElementById('email');
  const campoClave = document.getElementById('password');
  const botonOjo = document.querySelector('.toggle-password');
  const botonIngresar = document.querySelector('.btn-submit');
  const enlaceOlvido = document.querySelector('.forgot-password');

  // Mensaje de error sobre el botón Ingresar.
  const mensaje = document.createElement('p');
  mensaje.className = 'mensaje-error';
  mensaje.setAttribute('role', 'alert');
  mensaje.hidden = true;
  formulario.querySelector('.form-actions').parentNode.insertBefore(mensaje, formulario.querySelector('.form-actions'));

  function mostrarError(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = !texto;
  }

  function ocupado(valor) {
    botonIngresar.disabled = valor;
    M.util.etiquetaBoton(botonIngresar, valor ? 'Ingresando…' : 'Ingresar');
  }

  function traducir(error) {
    const texto = String((error && error.message) || error);
    if (texto === 'PERFIL') return 'Tu cuenta no tiene un perfil asignado. Contacta a tu supervisor.';
    if (texto === 'INACTIVO') return 'Tu cuenta está inactiva. Contacta a tu supervisor.';
    if (/invalid login credentials/i.test(texto)) return 'Correo o contraseña incorrectos.';
    if (/email not confirmed/i.test(texto)) return 'Debes confirmar tu correo antes de ingresar.';
    if (/fetch|network/i.test(texto)) return 'No hay conexión con el servidor. Inténtalo de nuevo.';
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }

  botonOjo.addEventListener('click', function () {
    const oculto = campoClave.type === 'password';
    campoClave.type = oculto ? 'text' : 'password';
    botonOjo.setAttribute('aria-label', oculto ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  formulario.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    mostrarError('');
    const correo = campoCorreo.value.trim();
    const clave = campoClave.value;

    if (!correo || !clave) return mostrarError('Ingresa tu correo y tu contraseña.');
    if (!M.cliente) {
      return mostrarError(M.configurado
        ? 'No se pudo cargar el servicio de autenticación. Revisa tu conexión.'
        : 'La aplicación aún no está configurada. Completa Compartido/config.js.');
    }
    if (navigator.onLine === false) {
      return mostrarError('Sin conexión. El primer inicio de sesión en el teléfono requiere Internet.');
    }

    ocupado(true);
    try {
      const acceso = await M.cliente.auth.signInWithPassword({ email: correo, password: clave });
      if (acceso.error) throw acceso.error;

      const perfil = await M.cargarPerfil(acceso.data.user.id);
      if (!perfil) {
        await M.cliente.auth.signOut();
        throw new Error('PERFIL');
      }
      if (perfil.activo === false) {
        await M.cliente.auth.signOut();
        throw new Error('INACTIVO');
      }
      M.cache.guardar('perfil', perfil);
      M.irA('inicio', null, true);
    } catch (error) {
      mostrarError(traducir(error));
      ocupado(false);
    }
  });

  enlaceOlvido.addEventListener('click', async function (evento) {
    evento.preventDefault();
    const correo = campoCorreo.value.trim();
    if (!correo) return M.ui.aviso('Escribe tu correo y vuelve a tocar «¿Olvidaste tu contraseña?».');
    if (!M.cliente || navigator.onLine === false) return M.ui.aviso('Necesitas conexión para recuperar tu contraseña.');
    const r = await M.cliente.auth.resetPasswordForEmail(correo);
    M.ui.aviso(r.error
      ? 'No se pudo enviar el correo de recuperación.'
      : 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
  });

  // Si ya hay una sesión válida en el teléfono, se entra directamente.
  if (M.cliente) {
    M.cliente.auth.getSession().then(function (r) {
      const sesion = r.data && r.data.session;
      if (!sesion) return null;
      return M.cargarPerfil(sesion.user.id).then(function (perfil) {
        if (perfil && perfil.activo !== false) {
          M.cache.guardar('perfil', perfil);
          M.irA('inicio', null, true);
        }
      });
    }).catch(function () { /* se muestra el formulario */ });
  }

  M.registrarSW();
})();