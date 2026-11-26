/**
 * supabase.js — Cliente único de Supabase para web y app móvil.
 * Reemplaza los valores de configuración con los de tu proyecto
 * (Project Settings → API).
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://bzacjwpscdwcoepsnckg.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_gAdd96YZwe3oVi_2UmzTeQ_omN8Lpqc';

  const cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.mantto = window.mantto || {};
  window.mantto.db = cliente;
})();