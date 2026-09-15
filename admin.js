// ===== ESPACE ADMIN : commandes du jour, préparation sur une période, historique =====
const $ = id => document.getElementById(id);

const views = { setup: $('viewSetup'), login: $('viewLogin'), denied: $('viewDenied'), dashboard: $('viewDashboard') };
const logoutBtn = $('adminLogout');
const loginForm = $('adminLoginForm');
const dayInput = $('dayInput');
const fromInput = $('fromInput');
const toInput = $('toInput');
const searchInput = $('searchInput');
const listEl = $('ordersList');

let mode = 'day';        // 'day' = un jour, 'period' = préparation du … au …, 'all' = toutes les commandes
let orders = [];
let adminId = null;
let requestId = 0;

// ===== OUTILS =====
const money = n => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const fmtWeight = g => g >= 1000 ? `${(g / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg` : `${Math.round(g)} g`;
const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const dayLabel = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) => new Date(iso + 'T12:00').toLocaleDateString('fr-FR', opts);
const slotHour = slot => parseInt(slot, 10) || 99; // "10h – 12h" → 10
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// "3,6 kg", "4 pièces" ou "3,6 kg + 2 pièces"
function qtyLabel(grams, pieces) {
  const parts = [];
  if (grams) parts.push(fmtWeight(grams));
  if (pieces) parts.push(plural(pieces, 'pièce'));
  return parts.join(' + ') || '—';
}

// Catégories dans l'ordre du site (products.js) + "Autres" pour un produit retiré du catalogue
const CATEGORY_ORDER = [...Object.keys(CATEGORIES), 'autre'];
const catLabel = key => (Object.hasOwn(CATEGORIES, key) ? CATEGORIES[key] : 'Autres');
const productCat = Object.fromEntries(PRODUCTS.map(p => [p.id, p.cat]));

function showView(name) {
  Object.entries(views).forEach(([key, el]) => { el.hidden = key !== name; });
  logoutBtn.hidden = name !== 'dashboard' && name !== 'denied';
}

// Articles d'une commande, nettoyés (les données viennent du navigateur des clients)
function itemsOf(order) {
  return (Array.isArray(order.items) ? order.items : []).map(i => {
    const id = String(i.id ?? i.name);
    const cat = Object.hasOwn(CATEGORIES, i.cat) ? i.cat : (Object.hasOwn(productCat, id) ? productCat[id] : 'autre');
    return {
      id,
      cat,
      name: String(i.name ?? 'Produit'),
      unit: i.unit === 'kg' ? 'kg' : 'piece',
      g: Math.max(0, Number(i.g) || 0),
      qty: Math.max(0, Math.round(Number(i.qty) || 0))
    };
  });
}

// ===== ACCÈS =====
async function checkAccess(session) {
  if (!session) {
    adminId = null;
    return showView('login');
  }
  if (session.user.id === adminId) return;

  const { data, error } = await db.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
  if (error) console.error(error);
  if (!data?.is_admin) {
    adminId = null;
    return showView('denied');
  }
  adminId = session.user.id;
  showView('dashboard');
  loadOrders();
}

if (!dbConfigured) {
  showView('setup');
} else {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
    setTimeout(() => checkAccess(session), 0);
  });
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = loginForm.querySelector('[type="submit"]');
  const errorEl = $('adminLoginError');
  errorEl.textContent = '';
  if (!loginForm.reportValidity()) return;

  btn.disabled = true;
  btn.classList.add('loading');
  try {
    await loginWithIdentifier($('adminId').value, $('adminPassword').value);
    loginForm.reset();
  } catch (err) {
    console.error(err);
    errorEl.textContent = authError(err);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
});

async function logout() {
  await db.auth.signOut();
  adminId = null;
  showView('login');
}
logoutBtn.addEventListener('click', logout);
$('deniedLogout').addEventListener('click', logout);

// ===== CONTRÔLES =====
dayInput.value = toISO(new Date());
fromInput.value = toISO(new Date());
toInput.value = toISO(addDays(new Date(), 6));

function setDay(date) {
  dayInput.value = toISO(date);
  loadOrders();
}
function shiftDay(n) {
  setDay(addDays(dayInput.value ? new Date(dayInput.value + 'T12:00') : new Date(), n));
}

$('prevDay').addEventListener('click', () => shiftDay(-1));
$('nextDay').addEventListener('click', () => shiftDay(1));
$('todayBtn').addEventListener('click', () => setDay(new Date()));
dayInput.addEventListener('change', () => { if (dayInput.value) loadOrders(); });

// Période : raccourcis + dates libres
document.querySelectorAll('[data-range]').forEach(btn => btn.addEventListener('click', () => {
  const today = new Date();
  const ranges = {
    today: [today, today],
    tomorrow: [addDays(today, 1), addDays(today, 1)],
    week: [today, addDays(today, 6)],
    month: [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)]
  };
  const [from, to] = ranges[btn.dataset.range];
  fromInput.value = toISO(from);
  toInput.value = toISO(to);
  loadOrders();
}));
[fromInput, toInput].forEach(input => input.addEventListener('change', () => {
  if (fromInput.value && toInput.value) loadOrders();
}));

searchInput.addEventListener('input', render);
$('refreshBtn').addEventListener('click', loadOrders);
$('printBtn').addEventListener('click', () => window.print());

document.querySelectorAll('.view-switch button').forEach(btn => btn.addEventListener('click', () => {
  if (btn.dataset.mode === mode) return;
  mode = btn.dataset.mode;
  document.querySelectorAll('.view-switch button').forEach(b => b.classList.toggle('active', b === btn));
  $('dayPicker').hidden = mode !== 'day';
  $('rangePicker').hidden = mode !== 'period';
  searchInput.hidden = mode !== 'all';
  $('summaryCard').hidden = mode !== 'day';
  $('periodCard').hidden = mode !== 'period';
  loadOrders();
}));

// ===== CHARGEMENT =====
function periodLabel() {
  const from = fromInput.value;
  const to = toInput.value;
  return from === to ? `du ${dayLabel(from)}` : `du ${dayLabel(from)} au ${dayLabel(to)}`;
}

async function loadOrders() {
  const req = ++requestId;
  const today = toISO(new Date());
  if (!dayInput.value) dayInput.value = today;
  if (!fromInput.value) fromInput.value = today;
  if (!toInput.value) toInput.value = fromInput.value;
  if (fromInput.value > toInput.value) [fromInput.value, toInput.value] = [toInput.value, fromInput.value];

  const titles = {
    day: [`Retraits du ${dayLabel(dayInput.value)}`, 'Commandes par créneau'],
    period: [`Préparation ${periodLabel()}`, 'Commandes de la période'],
    all: ['Toutes les commandes', 'Historique des commandes']
  };
  $('dashTitle').textContent = titles[mode][0];
  $('ordersTitle').textContent = titles[mode][1];
  $('summaryDate').textContent = `· ${dayLabel(dayInput.value)}`;
  $('periodLabel').textContent = periodLabel();
  listEl.innerHTML = '<p class="muted">Chargement…</p>';

  let query = db.from('orders').select('*');
  if (mode === 'day') {
    query = query.eq('pickup_date', dayInput.value).order('created_at', { ascending: true });
  } else if (mode === 'period') {
    query = query.gte('pickup_date', fromInput.value).lte('pickup_date', toInput.value)
      .order('pickup_date', { ascending: true }).order('created_at', { ascending: true });
  } else {
    query = query.order('pickup_date', { ascending: false }).order('created_at', { ascending: false }).limit(500);
  }

  const { data, error } = await query;
  if (req !== requestId) return; // une requête plus récente a été lancée

  orders = error ? [] : data;
  render();
  if (error) {
    console.error(error);
    listEl.innerHTML = '<p class="form-error">Impossible de charger les commandes.</p>';
  }
}

// ===== AFFICHAGE =====
function render() {
  const q = searchInput.value.trim().toLowerCase();
  let list = orders;
  if (mode === 'all' && q) {
    list = orders.filter(o => [o.customer_name, o.order_number, o.phone, o.email].some(v => String(v ?? '').toLowerCase().includes(q)));
  }
  if (mode === 'day') {
    list = [...list].sort((a, b) => slotHour(a.pickup_slot) - slotHour(b.pickup_slot) || String(a.created_at).localeCompare(String(b.created_at)));
  }

  const grams = list.reduce((sum, o) => sum + itemsOf(o).reduce((s, i) => s + (i.unit === 'kg' ? i.g * i.qty : 0), 0), 0);
  $('statOrders').textContent = list.length;
  $('statTotal').textContent = money(list.reduce((sum, o) => sum + Number(o.total || 0), 0));
  $('statWeight').textContent = fmtWeight(grams);

  if (mode === 'day') renderSummary(list);
  if (mode === 'period') renderPeriod(list);
  renderList(list);
}

// Total par produit (poids cumulé ou nombre de pièces)
function aggregate(list) {
  const rows = new Map();
  list.forEach(order => itemsOf(order).forEach(i => {
    const row = rows.get(i.id) || { name: i.name, cat: i.cat, grams: 0, pieces: 0, variants: new Map(), orders: new Set() };
    if (i.unit === 'kg') row.grams += i.g * i.qty;
    else row.pieces += i.qty;
    const variant = i.unit === 'kg' ? fmtWeight(i.g) : 'pièce';
    row.variants.set(variant, (row.variants.get(variant) || 0) + i.qty);
    row.orders.add(order.id);
    rows.set(i.id, row);
  }));
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

const sumQty = rows => qtyLabel(rows.reduce((s, r) => s + r.grams, 0), rows.reduce((s, r) => s + r.pieces, 0));

const productRow = r => `
  <tr>
    <td>${esc(r.name)}</td>
    <td><strong>${qtyLabel(r.grams, r.pieces)}</strong></td>
    <td>${[...r.variants].map(([variant, qty]) => `${qty} × ${esc(variant)}`).join(' · ')}</td>
    <td>${r.orders.size}</td>
  </tr>`;

// Vue "Par jour" : viande à préparer pour le jour choisi
function renderSummary(list) {
  const rows = aggregate(list);
  $('summaryWrap').hidden = !rows.length;
  $('summaryEmpty').hidden = !!rows.length;
  $('summaryBody').innerHTML = rows.map(productRow).join('');
}

// Vue "Préparation" : totaux par catégorie sur la période, détail par produit, répartition par jour
function renderPeriod(list) {
  const rows = aggregate(list);
  const cats = CATEGORY_ORDER
    .map(key => {
      const products = rows.filter(r => r.cat === key);
      return { key, label: catLabel(key), products, orders: new Set(products.flatMap(r => [...r.orders])).size };
    })
    .filter(c => c.products.length);

  $('periodEmpty').hidden = cats.length > 0;
  $('periodContent').hidden = cats.length === 0;
  if (!cats.length) return;

  $('catGrid').innerHTML = cats.map(c => `
    <div class="cat-card">
      <span class="cat-name">${esc(c.label)}</span>
      <strong>${sumQty(c.products)}</strong>
      <small>${plural(c.products.length, 'produit')} · ${plural(c.orders, 'commande')}</small>
    </div>`).join('');

  $('periodBody').innerHTML = cats.map(c => `
    <tr class="cat-row"><td colspan="4">${esc(c.label)}<span>${sumQty(c.products)}</span></td></tr>
    ${c.products.map(productRow).join('')}`).join('');

  const days = [...new Set(list.map(o => o.pickup_date))].sort();
  $('daysHead').innerHTML = `<tr><th>Jour</th><th>Commandes</th>${cats.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr>`;
  $('daysBody').innerHTML = days.map(day => {
    const dayOrders = list.filter(o => o.pickup_date === day);
    const dayRows = aggregate(dayOrders);
    const cells = cats.map(c => `<td>${sumQty(dayRows.filter(r => r.cat === c.key))}</td>`).join('');
    return `<tr><td>${esc(dayLabel(day))}</td><td>${dayOrders.length}</td>${cells}</tr>`;
  }).join('');
}

// Commandes groupées par créneau (vue jour) ou par date (préparation et historique)
function renderList(list) {
  if (!list.length) {
    const empty = { day: 'Aucune commande à retirer ce jour-là.', period: 'Aucune commande sur cette période.', all: 'Aucune commande trouvée.' };
    listEl.innerHTML = `<p class="muted">${empty[mode]}</p>`;
    return;
  }

  const groups = new Map();
  list.forEach(o => {
    const key = mode === 'day' ? o.pickup_slot : o.pickup_date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });

  listEl.innerHTML = [...groups].map(([key, group]) => {
    const label = mode === 'day' ? key : dayLabel(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `<h3 class="group-title">${esc(label)} <span>(${group.length})</span></h3>${group.map(orderCard).join('')}`;
  }).join('');
}

function orderCard(o) {
  const items = itemsOf(o).map(i =>
    `<li>${i.qty} × ${esc(i.name)}${i.unit === 'kg' ? ` <em>${fmtWeight(i.g)}</em>` : ''}</li>`
  ).join('');
  const created = new Date(o.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const tel = String(o.phone ?? '').replace(/[^0-9+]/g, '');

  return `
    <article class="admin-order">
      <div class="ao-head">
        ${mode !== 'day' ? `<span class="badge">${esc(o.pickup_slot)}</span>` : ''}
        <strong class="ao-name">${esc(o.customer_name)}</strong>
        <span class="ao-num">${esc(o.order_number)}</span>
        <span class="badge${o.user_id ? ' badge-green' : ''}">${o.user_id ? 'Compte client' : 'Sans compte'}</span>
        <b class="ao-total">${money(o.total)}</b>
      </div>
      <div class="ao-body">
        <ul class="ao-items">${items}</ul>
        <div class="ao-contact">
          <a href="tel:${tel}">${esc(o.phone)}</a>
          <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>
          <span>Commandé le ${created}</span>
        </div>
        ${o.notes ? `<p class="ao-notes"><b>Remarques :</b> ${esc(o.notes)}</p>` : ''}
      </div>
    </article>`;
}
