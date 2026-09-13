// ===== ESPACE CLIENT : connexion, inscription, historique des commandes =====
// Nécessite config.js (Supabase). Sans configuration, le bouton compte est masqué.
const Account = (() => {
  const accountBtn = document.getElementById('accountBtn');
  const checkoutHint = document.getElementById('checkoutHint');
  const api = { user: null, profile: null, onChange() {}, open() {}, refreshOrders() {} };

  if (!dbConfigured) {
    accountBtn.hidden = true;
    checkoutHint.hidden = true;
    return api;
  }

  const modal = document.getElementById('account');
  const overlay = document.getElementById('accountOverlay');
  const views = modal.querySelectorAll('.modal-view');
  const historyEl = document.getElementById('orderHistory');
  const adminLink = document.getElementById('adminLink');
  const listeners = [];

  const money = n => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const weight = g => g >= 1000 ? `${(g / 1000).toLocaleString('fr-FR')} kg` : `${g} g`;
  const localISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const val = id => document.getElementById(id).value.trim();

  // ----- Fenêtre -----
  const activeView = () => modal.querySelector('.modal-view.active')?.dataset.view;

  function show(view) {
    views.forEach(v => v.classList.toggle('active', v.dataset.view === view));
    modal.querySelectorAll('.form-error, .form-success').forEach(p => { p.textContent = ''; });
    if (view === 'profile') loadOrders();
    setTimeout(() => modal.querySelector('.modal-view.active input')?.focus(), 300);
  }

  function open(view) {
    show(view || (api.user ? 'profile' : 'login'));
    modal.classList.add('open');
    overlay.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function close() {
    modal.classList.remove('open');
    overlay.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    // Garde le blocage du scroll si le panier est encore ouvert
    if (!document.getElementById('cart').classList.contains('open')) document.body.classList.remove('no-scroll');
  }

  accountBtn.addEventListener('click', () => open());
  document.getElementById('checkoutLogin').addEventListener('click', () => open('login'));
  document.getElementById('accountClose').addEventListener('click', close);
  overlay.addEventListener('click', close);
  modal.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) show(go.dataset.go);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      e.stopImmediatePropagation(); // ne ferme pas le panier en même temps
      close();
    }
  });

  // ----- Session -----
  async function setUser(user) {
    if (user?.id === api.user?.id && (api.profile || !user)) return;
    api.user = user;
    api.profile = null;
    if (user) {
      const { data, error } = await db.from('profiles').select('pseudo, email, phone, is_admin').eq('id', user.id).maybeSingle();
      if (error) console.error(error);
      if (api.user !== user) return; // déconnecté entre-temps
      api.profile = data || { pseudo: user.email, email: user.email, phone: '', is_admin: false };
    }
    render();
  }

  function render() {
    const { user, profile } = api;
    accountBtn.classList.toggle('logged', !!user);
    accountBtn.setAttribute('aria-label', user ? 'Mon compte' : 'Se connecter');
    checkoutHint.hidden = !!user;
    adminLink.hidden = !profile?.is_admin;
    if (profile) {
      document.getElementById('profilePseudo').textContent = profile.pseudo;
      document.getElementById('profileEmail').textContent = profile.email;
      document.getElementById('profilePhone').textContent = profile.phone || '—';
    }
    if (modal.classList.contains('open')) {
      const view = activeView();
      if (user && (view === 'login' || view === 'signup')) show('profile');
      if (!user && view === 'profile') show('login');
    }
    listeners.forEach(fn => fn(user, profile));
  }

  db.auth.onAuthStateChange((event, session) => {
    // setTimeout : Supabase déconseille d'appeler la base directement dans ce rappel
    setTimeout(async () => {
      await setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') open('reset');
    }, 0);
  });

  // ----- Formulaires -----
  function handleForm(formId, task) {
    const formEl = document.getElementById(formId);
    formEl.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = formEl.querySelector('[type="submit"]');
      const errorEl = formEl.querySelector('.form-error');
      const successEl = formEl.querySelector('.form-success');
      errorEl.textContent = '';
      if (successEl) successEl.textContent = '';
      if (!formEl.reportValidity()) return;

      btn.disabled = true;
      btn.classList.add('loading');
      try {
        await task(formEl, { errorEl, successEl });
      } catch (err) {
        console.error(err);
        errorEl.textContent = authError(err);
      } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });
  }

  // Connexion avec pseudo ou e-mail
  handleForm('loginForm', async formEl => {
    const { user } = await loginWithIdentifier(val('loginId'), document.getElementById('loginPassword').value);
    formEl.reset();
    await setUser(user);
  });

  // Inscription : pseudo, e-mail, téléphone, mot de passe
  handleForm('signupForm', async (formEl, { errorEl, successEl }) => {
    const pseudo = val('signupPseudo');
    const { data: free, error: pseudoError } = await db.rpc('pseudo_available', { p_pseudo: pseudo });
    if (pseudoError) throw pseudoError;
    if (!free) {
      errorEl.textContent = 'Ce pseudo est déjà pris.';
      return;
    }

    const { data, error } = await db.auth.signUp({
      email: val('signupEmail'),
      password: document.getElementById('signupPassword').value,
      options: { data: { pseudo, phone: val('signupPhone') } }
    });
    if (error) throw error;
    formEl.reset();
    if (data.session) await setUser(data.user);
    else successEl.textContent = "Compte créé ! Cliquez sur le lien reçu par e-mail pour l'activer, puis connectez-vous.";
  });

  // Mot de passe oublié : lien envoyé par e-mail
  handleForm('forgotForm', async (formEl, { successEl }) => {
    const { error } = await db.auth.resetPasswordForEmail(val('forgotEmail'), { redirectTo: location.origin + location.pathname });
    if (error) throw error;
    formEl.reset();
    successEl.textContent = 'Si un compte existe avec cet e-mail, un lien de réinitialisation vient de vous être envoyé.';
  });

  // Nouveau mot de passe (après clic sur le lien reçu)
  handleForm('resetForm', async (formEl, { successEl }) => {
    const { error } = await db.auth.updateUser({ password: document.getElementById('resetPassword').value });
    if (error) throw error;
    formEl.reset();
    successEl.textContent = 'Mot de passe modifié ✓';
    setTimeout(() => show('profile'), 1200);
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    await setUser(null);
    close();
  });

  // ----- Historique des commandes -----
  async function loadOrders() {
    const user = api.user;
    if (!user) return;
    historyEl.innerHTML = '<p class="muted">Chargement…</p>';

    const { data, error } = await db.from('orders')
      .select('order_number, pickup_date, pickup_slot, items, total, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (api.user !== user) return;
    if (error) {
      console.error(error);
      historyEl.innerHTML = '<p class="form-error">Impossible de charger vos commandes.</p>';
      return;
    }
    if (!data.length) {
      historyEl.innerHTML = '<p class="muted">Aucune commande pour le moment.</p>';
      return;
    }

    const today = localISO(new Date());
    historyEl.innerHTML = data.map(o => {
      const upcoming = o.pickup_date >= today;
      const date = new Date(o.pickup_date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const items = (Array.isArray(o.items) ? o.items : []).map(i =>
        `<li>${esc(i.qty)} × ${esc(i.name)}${i.g ? ` <em>${esc(weight(Number(i.g)))}</em>` : ''}</li>`
      ).join('');

      return `
        <article class="history-card">
          <div class="history-top">
            <strong>${esc(o.order_number)}</strong>
            <span class="badge${upcoming ? ' badge-green' : ''}">${upcoming ? 'À venir' : 'Passée'}</span>
          </div>
          <p class="history-date">Retrait le ${esc(date)} · ${esc(o.pickup_slot)}</p>
          <ul>${items}</ul>
          <div class="history-total"><span>Total estimé</span><b>${money(o.total)}</b></div>
        </article>`;
    }).join('');
  }

  api.onChange = fn => listeners.push(fn);
  api.open = open;
  api.refreshOrders = loadOrders;
  return api;
})();
