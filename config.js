// ===== CONFIGURATION SUPABASE (comptes clients + commandes) =====
// À récupérer dans Supabase : Project Settings → API
// La clé "publishable" (ou "anon") est faite pour être publique : la sécurité
// est assurée par les règles de supabase.sql.
const SUPABASE_URL = 'https://qhdbvsmsrjkupkrwdsex.supabase.co';
const SUPABASE_KEY = 'sb_publishable__5iNh74-8rFK11z-Mbi1Tg_wWffBl36';

const dbConfigured = !SUPABASE_URL.startsWith('VOTRE') && !SUPABASE_KEY.startsWith('VOTRE') && typeof window.supabase !== 'undefined';
const db = dbConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Protège l'affichage des textes saisis par les clients
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Connexion avec un pseudo OU un e-mail
async function loginWithIdentifier(identifier, password) {
  let email = identifier.trim();
  if (!email.includes('@')) {
    const { data, error } = await db.rpc('email_for_login', { p_identifier: email, p_password: password });
    if (error) throw error;
    if (!data) throw new Error('Invalid login credentials');
    email = data;
  }
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Traduit les erreurs Supabase en messages clairs
function authError(err) {
  const msg = String(err?.message || err);
  if (/Invalid login credentials/i.test(msg)) return 'Identifiant ou mot de passe incorrect.';
  if (/Email not confirmed/i.test(msg)) return "Confirmez d'abord votre e-mail (lien reçu par mail).";
  if (/already registered|already exists/i.test(msg)) return 'Un compte existe déjà avec cet e-mail.';
  if (/Database error saving new user|duplicate key/i.test(msg)) return 'Ce pseudo est déjà pris.';
  if (/password/i.test(msg) && /least|weak|short/i.test(msg)) return 'Mot de passe trop faible (8 caractères minimum).';
  if (/rate limit|too many/i.test(msg)) return 'Trop de tentatives, réessayez dans quelques minutes.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Connexion impossible, vérifiez votre réseau.';
  return 'Une erreur est survenue, réessayez.';
}
