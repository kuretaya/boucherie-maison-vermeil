// ===== CONFIGURATION =====
// Clé Web3Forms : à créer gratuitement sur https://web3forms.com avec l'adresse
// qui doit RECEVOIR les commandes. Tant qu'elle n'est pas remplacée, le site
// fonctionne en mode démo (aucun e-mail envoyé).
const WEB3FORMS_KEY = 'VOTRE_CLE_WEB3FORMS';
const SHOP_NAME = 'Maison Vermeil';
const SHOP_PHONE = '01 00 00 00 00';

// ===== CATALOGUE =====
// unit 'kg'    : prix au kilo + choix du poids (en grammes)
// unit 'piece' : prix fixe à la pièce
const CATEGORIES = { boeuf: 'Bœuf', agneau: 'Agneau', porc: 'Porc', volaille: 'Volaille', colis: 'Colis & apéro' };

const PRODUCTS = [
  { id: 'entrecote', cat: 'boeuf', name: 'Entrecôte maturée', desc: 'Persillée et fondante, maturée 21 jours sur os.', img: '1603048297172-c92544798d5a', unit: 'kg', price: 36.9, weights: [300, 600, 1000] },
  { id: 'cote-boeuf', cat: 'boeuf', name: 'Côte de bœuf', desc: 'Maturée 28 jours, idéale au barbecue ou à la plancha.', img: '1615937657715-bc7b4b7962c1', unit: 'kg', price: 39.9, weights: [1000, 1200, 1500] },
  { id: 'faux-filet', cat: 'boeuf', name: 'Faux-filet', desc: 'Tendre et savoureux, bordé de son gras nacré.', img: '1560781290-7dc94c0f8f4f', unit: 'kg', price: 32.5, weights: [300, 600, 1000] },
  { id: 'cotelettes-agneau', cat: 'agneau', name: "Côtelettes d'agneau", desc: 'Agneau fermier, à saisir quelques minutes par face.', img: '1602470520998-f4a52199a3d6', unit: 'kg', price: 34, weights: [400, 800, 1200] },
  { id: 'cotes-porc', cat: 'porc', name: 'Côtes de porc fermier', desc: 'Porc élevé sur paille, chair rosée et juteuse.', img: '1628268909376-e8c44bb3153f', unit: 'kg', price: 14.9, weights: [500, 1000, 1500] },
  { id: 'travers', cat: 'porc', name: 'Travers marinés', desc: 'Marinade maison miel et épices, prêts à griller.', img: '1544025162-d76694265947', unit: 'kg', price: 13.5, weights: [500, 1000, 1500] },
  { id: 'poulet', cat: 'volaille', name: 'Poulet fermier', desc: 'Label Rouge, élevé en plein air 81 jours minimum.', img: '1598103442097-8b74394b95c6', unit: 'piece', price: 18.9, info: 'Environ 1,8 kg' },
  { id: 'plateau-apero', cat: 'colis', name: 'Plateau charcuterie', desc: 'Jambon sec, saucissons, terrine maison et condiments.', img: '1541529086526-db283c563270', unit: 'piece', price: 29, info: 'Pour 4 à 6 personnes' },
  { id: 'colis-bbq', cat: 'colis', name: 'Colis barbecue', desc: 'Saucisses, merguez, bavette, travers et côtes d\'agneau.', img: '1607623814075-e51df1bdc82f', unit: 'piece', price: 59, info: 'Environ 2,5 kg · 6 personnes' }
];

// ===== OUTILS =====
const img = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const euro = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const formatWeight = g => g >= 1000 ? `${(g / 1000).toLocaleString('fr-FR')} kg` : `${g} g`;
const getProduct = id => PRODUCTS.find(p => p.id === id);
// Prix d'une ligne (arrondi au centime)
const unitPrice = (p, g) => p.unit === 'kg' ? Math.round(p.price * g / 10) / 100 : p.price;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasHover = window.matchMedia('(hover: hover)').matches;

// ===== Écran de chargement =====
const loadStart = performance.now();
function hideLoader() {
  const wait = Math.max(0, 900 - (performance.now() - loadStart));
  setTimeout(() => document.body.classList.add('loaded'), wait);
}
if (document.readyState === 'complete') hideLoader();
else {
  window.addEventListener('load', hideLoader, { once: true });
  setTimeout(hideLoader, 2500);
}

// ===== Affichage des produits =====
const grid = document.getElementById('productGrid');

grid.innerHTML = PRODUCTS.map((p, i) => {
  const isKg = p.unit === 'kg';
  const delay = i % 3 ? ` delay-${i % 3}` : '';
  const options = isKg
    ? p.weights.map((g, j) => `<button type="button" class="${j === 1 ? 'active' : ''}" data-g="${g}">${formatWeight(g)}</button>`).join('')
    : `<span class="piece-info">${p.info}</span>`;

  return `
    <article class="card reveal-up${delay}" data-cat="${p.cat}" data-id="${p.id}">
      <div class="card-img">
        <img src="${img(p.img, 700)}" alt="${p.name}" loading="lazy">
        <span class="tag">${CATEGORIES[p.cat]}</span>
      </div>
      <div class="card-body">
        <div class="card-top">
          <h3>${p.name}</h3>
          <span class="price">${euro(p.price)}<small>/${isKg ? 'kg' : 'pièce'}</small></span>
        </div>
        <p>${p.desc}</p>
        <div class="weights">${options}</div>
        <div class="card-foot">
          <span class="line-price">${isKg ? '≈ ' + euro(unitPrice(p, p.weights[1])) : euro(p.price)}</span>
          <button type="button" class="add-btn"><span>Ajouter</span></button>
        </div>
      </div>
    </article>`;
}).join('');

// Choix du poids + ajout au panier
grid.addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (!card) return;
  const p = getProduct(card.dataset.id);

  const weightBtn = e.target.closest('.weights button');
  if (weightBtn) {
    card.querySelectorAll('.weights button').forEach(b => b.classList.toggle('active', b === weightBtn));
    card.querySelector('.line-price').textContent = '≈ ' + euro(unitPrice(p, +weightBtn.dataset.g));
    return;
  }

  const addBtn = e.target.closest('.add-btn');
  if (addBtn) {
    const active = card.querySelector('.weights button.active');
    addToCart(p.id, active ? +active.dataset.g : null);
    flyToCart(card.querySelector('.card-img img'));

    const label = addBtn.querySelector('span');
    addBtn.classList.add('added');
    label.textContent = 'Ajouté ✓';
    clearTimeout(addBtn.resetTimer);
    addBtn.resetTimer = setTimeout(() => {
      addBtn.classList.remove('added');
      label.textContent = 'Ajouter';
    }, 1600);
  }
});

// ===== PANIER =====
const CART_KEY = 'vermeil-cart';
const cartEl = document.getElementById('cart');
const cartOverlay = document.getElementById('cartOverlay');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartFoot = document.getElementById('cartFoot');
const cartTotal = document.getElementById('cartTotal');
const checkoutTotal = document.getElementById('checkoutTotal');
const toastEl = document.getElementById('toast');

// Panier = [{ id, g, qty }] ; g = poids en grammes (null pour les pièces)
let cart = loadCart();

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    // Ignore les lignes invalides (produit supprimé du catalogue, etc.)
    return saved.filter(l => {
      const p = getProduct(l.id);
      if (!p || !Number.isInteger(l.qty) || l.qty < 1) return false;
      return p.unit === 'kg' ? p.weights.includes(l.g) : l.g === null;
    });
  } catch {
    return [];
  }
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

const cartTotalValue = () => Math.round(cart.reduce((sum, l) => sum + unitPrice(getProduct(l.id), l.g) * l.qty, 0) * 100) / 100;

function addToCart(id, g) {
  const line = cart.find(l => l.id === id && l.g === g);
  if (line) line.qty++;
  else cart.push({ id, g, qty: 1 });
  saveCart();
  renderCart();
  const p = getProduct(id);
  showToast(`${p.name}${g ? ' · ' + formatWeight(g) : ''} ajouté au panier`);
}

function renderCart() {
  const count = cart.reduce((sum, l) => sum + l.qty, 0);
  cartCount.textContent = count;
  cartCount.classList.toggle('show', count > 0);
  cartEmpty.hidden = count > 0;
  cartFoot.hidden = count === 0;

  cartItems.innerHTML = cart.map((l, i) => {
    const p = getProduct(l.id);
    const price = unitPrice(p, l.g);
    return `
      <li class="cart-item" style="--i:${i}">
        <img src="${img(p.img, 160)}" alt="">
        <div class="ci-info">
          <strong>${p.name}</strong>
          <span>${l.g ? formatWeight(l.g) : 'À la pièce'} · ${euro(price)}</span>
          <div class="qty">
            <button data-action="minus" data-index="${i}" aria-label="Retirer un">−</button>
            <span>${l.qty}</span>
            <button data-action="plus" data-index="${i}" aria-label="Ajouter un">+</button>
          </div>
        </div>
        <div class="ci-right">
          <strong>${euro(price * l.qty)}</strong>
          <button class="ci-remove" data-action="remove" data-index="${i}">Supprimer</button>
        </div>
      </li>`;
  }).join('');

  const total = euro(cartTotalValue());
  cartTotal.textContent = total;
  checkoutTotal.textContent = total;
}

cartItems.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const line = cart[+btn.dataset.index];
  if (btn.dataset.action === 'plus') line.qty++;
  if (btn.dataset.action === 'minus') line.qty--;
  if (btn.dataset.action === 'remove') line.qty = 0;
  cart = cart.filter(l => l.qty > 0);
  saveCart();
  renderCart();
});

// Ouverture / fermeture du tiroir
function openCart() {
  cartEl.classList.add('open', 'animate-items');
  cartOverlay.classList.add('open');
  cartEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  setTimeout(() => cartEl.classList.remove('animate-items'), 1200);
}

function closeCart() {
  cartEl.classList.remove('open');
  cartOverlay.classList.remove('open');
  cartEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  // Après une commande validée, on revient au panier pour la prochaine ouverture
  if (currentStep() !== 'checkout') setTimeout(() => showStep('cart'), 600);
}

const steps = document.querySelectorAll('.cart-step');
const cartTitle = document.getElementById('cartTitle');
const STEP_TITLES = { cart: 'Votre commande', checkout: 'Retrait en boutique', done: 'Commande envoyée' };
const currentStep = () => document.querySelector('.cart-step.active').dataset.step;

function showStep(name) {
  steps.forEach(s => s.classList.toggle('active', s.dataset.step === name));
  cartTitle.textContent = STEP_TITLES[name];
}

cartBtn.addEventListener('click', openCart);
cartOverlay.addEventListener('click', closeCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
cartEl.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeCart));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cartEl.classList.contains('open')) closeCart(); });

document.getElementById('toCheckout').addEventListener('click', () => showStep('checkout'));
document.getElementById('backToCart').addEventListener('click', () => showStep('cart'));

// Animation : la photo du produit "vole" jusqu'au panier
function flyToCart(imgEl) {
  if (reduceMotion) return bumpCount();
  const from = imgEl.getBoundingClientRect();
  const to = cartBtn.getBoundingClientRect();
  const clone = imgEl.cloneNode();
  clone.className = 'fly-img';
  Object.assign(clone.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  clone.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '16px' },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 80}px) scale(.45)`, opacity: 1, borderRadius: '40px', offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: .5, borderRadius: '50%' }
  ], { duration: 900, easing: 'cubic-bezier(.55, 0, .35, 1)' }).onfinish = () => {
    clone.remove();
    bumpCount();
  };
}

function bumpCount() {
  cartCount.classList.remove('bump');
  void cartCount.offsetWidth;
  cartCount.classList.add('bump');
}

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

renderCart();

// ===== FORMULAIRE DE COMMANDE =====
const form = document.getElementById('orderForm');
const dateInput = document.getElementById('date');
const slotSelect = document.getElementById('creneau');
const submitBtn = document.getElementById('submitOrder');
const formError = document.getElementById('formError');

const SLOTS = {
  week: ['8h – 10h', '10h – 12h', '12h – 14h', '14h – 16h', '16h – 18h', '18h – 19h30'],
  sunday: ['8h – 10h', '10h – 13h']
};

const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const maxDate = new Date();
maxDate.setDate(maxDate.getDate() + 30);
dateInput.min = toISO(tomorrow);
dateInput.max = toISO(maxDate);

// Créneaux selon le jour (fermé le lundi, matin seulement le dimanche)
function updateSlots() {
  slotSelect.innerHTML = '';
  dateInput.setCustomValidity('');

  if (!dateInput.value) {
    slotSelect.add(new Option('Choisir un jour', ''));
    slotSelect.disabled = true;
    return;
  }

  const day = new Date(dateInput.value + 'T12:00').getDay();
  if (day === 1) {
    dateInput.setCustomValidity('La boucherie est fermée le lundi, choisissez un autre jour.');
    dateInput.reportValidity();
    slotSelect.add(new Option('Fermé le lundi', ''));
    slotSelect.disabled = true;
    return;
  }

  slotSelect.add(new Option('Choisir un créneau', ''));
  (day === 0 ? SLOTS.sunday : SLOTS.week).forEach(s => slotSelect.add(new Option(s, s)));
  slotSelect.disabled = false;
}
dateInput.addEventListener('change', updateSlots);

function makeOrderId() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `MV-${stamp}-${Math.floor(100 + Math.random() * 900)}`;
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  formError.textContent = '';
  if (!form.reportValidity()) return;
  if (slotSelect.disabled || !slotSelect.value) {
    formError.textContent = 'Choisissez un jour et un créneau de retrait.';
    return;
  }
  if (!cart.length) return showStep('cart');
  if (form.botcheck.checked) return; // anti-spam

  const data = Object.fromEntries(new FormData(form));
  const orderId = makeOrderId();
  const dateLabel = new Date(data.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const pickup = `${dateLabel}, ${data.creneau}`;
  const total = euro(cartTotalValue());
  const lines = cart.map(l => {
    const p = getProduct(l.id);
    return `• ${l.qty} × ${p.name}${l.g ? ` (${formatWeight(l.g)})` : ''} — ${euro(unitPrice(p, l.g) * l.qty)}`;
  }).join('\n');

  submitBtn.disabled = true;
  submitBtn.classList.add('loading');

  try {
    const demo = WEB3FORMS_KEY.startsWith('VOTRE');

    if (demo) {
      await new Promise(r => setTimeout(r, 1200));
      console.info(`[Mode démo] Commande ${orderId}\n${data.nom} · ${data.telephone} · ${data.email}\nRetrait : ${pickup}\n${lines}\nTotal estimé : ${total}`);
    } else {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Nouvelle commande ${orderId} — ${data.nom}`,
          from_name: `Site ${SHOP_NAME}`,
          name: data.nom,
          email: data.email,
          'Téléphone': data.telephone,
          'N° de commande': orderId,
          'Retrait': pickup,
          'Commande': lines,
          'Total estimé': total,
          'Remarques': data.remarques || '—'
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    }

    document.getElementById('orderNumber').textContent = orderId;
    document.getElementById('orderPickup').textContent = `Retrait le ${pickup}.`;
    document.getElementById('demoNote').hidden = !demo;

    cart = [];
    saveCart();
    renderCart();
    form.reset();
    updateSlots();
    showStep('done');
  } catch (err) {
    console.error(err);
    formError.textContent = `L'envoi a échoué. Réessayez ou appelez-nous au ${SHOP_PHONE}.`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
});

// ===== Navigation : fond au scroll + menu mobile =====
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ===== Diaporama du hero =====
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('#heroDots button');
let current = 0;
let timer;

function showSlide(index) {
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = index;
  // Relance l'animation Ken Burns
  void slides[current].offsetWidth;
  slides[current].classList.add('active');
  dots[current].classList.add('active');
}

function startSlider() {
  clearInterval(timer);
  timer = setInterval(() => showSlide((current + 1) % slides.length), 6000);
}

dots.forEach((dot, i) => dot.addEventListener('click', () => {
  if (i !== current) showSlide(i);
  startSlider();
}));
startSlider();

// ===== Apparition des éléments au scroll =====
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-up, .reveal-left').forEach(el => revealObserver.observe(el));

// ===== Compteurs animés =====
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = +el.dataset.target;
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.6 });

document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

// ===== Parallax des photos =====
const parallaxImgs = document.querySelectorAll('[data-parallax]');

function updateParallax() {
  const vh = window.innerHeight;
  parallaxImgs.forEach(image => {
    const rect = image.parentElement.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > vh) return;
    const offset = (rect.top + rect.height / 2 - vh / 2) * parseFloat(image.dataset.parallax);
    image.style.transform = `translateY(calc(-6% + ${offset}px))`;
  });
}

if (!reduceMotion) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateParallax(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  updateParallax();
}

// ===== Effet 3D au survol des cartes produits =====
const cards = document.querySelectorAll('.card');

cards.forEach(card => {
  if (!hasHover || reduceMotion) return;
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

// ===== Filtres produits =====
const filterBtns = document.querySelectorAll('#filters button');

filterBtns.forEach(btn => btn.addEventListener('click', () => {
  filterBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filter = btn.dataset.filter;

  cards.forEach(card => {
    const match = filter === 'all' || card.dataset.cat === filter;
    card.classList.toggle('hide', !match);
    if (match) {
      card.classList.add('visible');
      card.animate(
        [{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 600, easing: 'cubic-bezier(.22,.61,.36,1)' }
      );
    }
  });
}));

// ===== Bande défilante : duplique les photos pour une boucle infinie =====
const track = document.querySelector('.marquee-track');
track.innerHTML += track.innerHTML;

// ===== Statut ouvert / fermé =====
const hours = {
  0: [8, 13],   // dimanche
  1: null,      // lundi
  2: [8, 19.5], 3: [8, 19.5], 4: [8, 19.5], 5: [8, 19.5], 6: [8, 19.5]
};
const now = new Date();
const today = hours[now.getDay()];
const time = now.getHours() + now.getMinutes() / 60;
const status = document.getElementById('openStatus');
const isOpen = today && time >= today[0] && time < today[1];
status.textContent = isOpen ? 'Ouvert en ce moment' : 'Fermé en ce moment';
status.classList.add(isOpen ? 'open' : 'closed');

// ===== Année du footer =====
document.getElementById('year').textContent = new Date().getFullYear();
