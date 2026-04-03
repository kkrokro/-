/* ============================================================
   HOTEL HAMBI — main.js
   Handles: Supabase connection, auth, realtime rooms,
            animations, booking modal, contact form, nav, etc.
   ============================================================ */

'use strict';

/* ── Supabase Config ─────────────────────────────────────────
   Replace these values with your actual Supabase project URL
   and anon/public API key from: supabase.com → Settings → API
   ─────────────────────────────────────────────────────────── */
const SUPABASE_URL  = 'https://kbrinouywkznepwwznxb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imticmlub3V5d2t6bmVwd3d6bnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjY5NDUsImV4cCI6MjA5MDcwMjk0NX0.nkA7geogEVkziQD_sl6VBU9cmCEKzmiMpdWuYBlGvo4';

/* ── Supabase Client ──────────────────────────────────────── */
let _supabase = null;

async function initSupabase() {
  if (typeof window.supabase !== 'undefined') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    return true;
  }
  return false;
}

/* ============================================================
   AUTH HELPERS
   ============================================================ */

/** Returns the current Supabase session, or null */
async function getSession() {
  if (!_supabase) return null;
  const { data: { session } } = await _supabase.auth.getSession();
  return session;
}

/** Returns display name from session or demo storage */
function getUserDisplayName(session) {
  if (session) {
    return session.user.user_metadata?.full_name
        || session.user.email.split('@')[0];
  }
  // Demo mode
  const demo = getDemoUser();
  return demo ? (demo.name || demo.email.split('@')[0]) : null;
}

function getDemoUser() {
  try { return JSON.parse(localStorage.getItem('hambi_demo_user') || 'null'); } catch { return null; }
}

function isLoggedIn(session) {
  return !!session || !!getDemoUser();
}

/** Redirect to auth page, saving the current page as destination */
function redirectToAuth(tab = 'login') {
  sessionStorage.setItem('hambi_booking_redirect', window.location.href);
  window.location.href = 'auth.html?tab=' + tab;
}

/** Sign out */
async function signOut() {
  localStorage.removeItem('hambi_demo_user');
  if (_supabase) await _supabase.auth.signOut();
  window.location.href = 'index.html';
}

/* ── Navbar user pill (shown when logged in) ── */
async function initAuthNavbar(session) {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  // Remove any existing auth link/pill
  navLinks.querySelectorAll('.nav-auth-item').forEach(el => el.remove());

  const li = document.createElement('li');
  li.className = 'nav-auth-item';

  if (isLoggedIn(session)) {
    const name = getUserDisplayName(session);
    const initials = name.slice(0, 2).toUpperCase();
    li.innerHTML = `
      <div class="nav-user-pill" id="nav-user-pill" onclick="toggleUserDropdown(this)">
        <div class="nav-user-avatar">${initials}</div>
        <span>${name}</span>
        <span style="font-size:0.6rem;margin-left:2px">▼</span>
        <div class="nav-user-dropdown">
          <a href="index.html">🏠 Home</a>
          <hr/>
          <button onclick="event.stopPropagation(); signOut()">Sign Out</button>
        </div>
      </div>`;
  } else {
    li.innerHTML = `<a href="auth.html" class="btn btn-gold" style="padding:0.35rem 1rem;font-size:0.75rem;letter-spacing:0.1em">Sign In</a>`;
  }
  navLinks.appendChild(li);

  // Also update mobile nav
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav) {
    mobileNav.querySelectorAll('.mob-auth').forEach(el => el.remove());
    const a = document.createElement('a');
    a.className = 'mob-auth';
    if (isLoggedIn(session)) {
      a.textContent = 'Sign Out';
      a.href = '#';
      a.addEventListener('click', e => { e.preventDefault(); signOut(); });
    } else {
      a.textContent = 'Sign In';
      a.href = 'auth.html';
    }
    mobileNav.appendChild(a);
  }
}

function toggleUserDropdown(pill) {
  pill.classList.toggle('open');
  // Close on outside click
  const close = e => {
    if (!pill.contains(e.target)) {
      pill.classList.remove('open');
      document.removeEventListener('click', close);
    }
  };
  if (pill.classList.contains('open')) {
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // Scroll effect
  const onScroll = () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active link highlight
  const links = navbar.querySelectorAll('.nav-links a');
  const page  = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Hamburger menu
  const hamburger  = document.querySelector('.hamburger');
  const mobileNav  = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
}

/* ============================================================
   SCROLL ANIMATIONS (Intersection Observer)
   ============================================================ */
function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => observer.observe(el));
}

/* ============================================================
   ROOMS — Fetch & Render
   ============================================================ */

/**
 * Render skeleton placeholders while rooms are loading
 * @param {HTMLElement} container
 * @param {number} count
 */
function renderSkeletons(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'room-card room-skeleton';
    sk.innerHTML = `
      <div class="room-card-img skeleton"></div>
      <div class="room-card-body" style="padding:1.5rem">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:70%"></div>
        <div class="room-card-footer" style="margin-top:1rem">
          <div class="skeleton skeleton-price"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    `;
    container.appendChild(sk);
  }
}

/**
 * Create a single room card DOM element
 * @param {Object} room
 * @returns {HTMLElement}
 */
function createRoomCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card fade-in';
  card.dataset.id = room.id;

  const availBadge = room.available
    ? '<span class="room-card-badge badge-available">Available</span>'
    : '<span class="room-card-badge badge-booked">Booked</span>';

  const imgSrc = room.image_url
    ? room.image_url
    : 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=75';

  card.innerHTML = `
    <div class="room-card-img">
      <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(room.name)}" loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=75'">
      ${availBadge}
    </div>
    <div class="room-card-body">
      <h3>${escapeHtml(room.name)}</h3>
      <p>${escapeHtml(room.description || 'A comfortable and well-appointed room.')}</p>
      <div class="room-card-footer">
        <div class="room-price">
          <strong>₹${Number(room.price).toLocaleString('en-IN')}</strong>
          <span>per night</span>
        </div>
        ${room.available
          ? `<button class="btn btn-gold btn-sm book-btn" data-id="${room.id}" data-name="${escapeHtml(room.name)}" data-price="${room.price}">Book Now</button>`
          : `<button class="btn btn-outline btn-sm" disabled style="opacity:0.4;cursor:not-allowed">Unavailable</button>`
        }
      </div>
    </div>
  `;
  return card;
}

/**
 * Fetch rooms from Supabase and render to container
 * @param {string} containerId
 * @param {number} limit   - 0 means all
 */
async function loadRooms(containerId, limit = 0) {
  const container = document.getElementById(containerId);
  if (!container) return;

  renderSkeletons(container, limit || 3);

  if (!_supabase) {
    // Supabase not configured — show demo rooms
    renderDemoRooms(container, limit);
    return;
  }

  try {
    let query = _supabase.from('rooms').select('*').order('id');
    if (limit > 0) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    renderRoomList(container, data || []);
    updateRoomStats(data || []);

  } catch (err) {
    console.warn('Supabase unavailable, loading demo data:', err.message);
    renderDemoRooms(container, limit);
  }
}

function renderRoomList(container, rooms) {
  container.innerHTML = '';
  if (!rooms.length) {
    container.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:3rem">No rooms found.</p>';
    return;
  }
  rooms.forEach(room => {
    const card = createRoomCard(room);
    container.appendChild(card);
  });
  initScrollAnimations();
  initBookingButtons();
  updateRoomsStatusBar(rooms);
}

function updateRoomsStatusBar(rooms) {
  const bar = document.getElementById('rooms-status-bar');
  if (!bar) return;
  const avail = rooms.filter(r => r.available).length;
  bar.innerHTML = `Showing <strong>${rooms.length}</strong> rooms — <strong>${avail}</strong> available`;
}

function updateRoomStats(rooms) {
  setEl('stat-total',  rooms.length);
  setEl('stat-avail',  rooms.filter(r => r.available).length);
  setEl('stat-booked', rooms.filter(r => !r.available).length);
}

/* ── Demo Rooms (shown when Supabase not yet configured) ──── */
const DEMO_ROOMS = [
  {
    id: 1,
    name: 'Deluxe King Room',
    description: 'Spacious king-size bed, AC, LED TV, and city views. Ideal for couples or business travellers.',
    price: 1800,
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=75',
    available: true
  },
  {
    id: 2,
    name: 'Executive Suite',
    description: 'Our premium suite featuring a separate lounge, premium bath, and panoramic Diphu views.',
    price: 3200,
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=75',
    available: true
  },
  {
    id: 3,
    name: 'Standard Double Room',
    description: 'Comfortable double room with all essentials — perfect for a budget-friendly stay.',
    price: 1200,
    image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&q=75',
    available: false
  },
  {
    id: 4,
    name: 'Family Suite',
    description: 'Spacious suite accommodating families of up to 4, with two beds and a sitting area.',
    price: 2800,
    image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=75',
    available: true
  },
  {
    id: 5,
    name: 'Twin Comfort Room',
    description: 'Two single beds, great for colleagues or friends. Quiet floor with garden-facing window.',
    price: 1500,
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=75',
    available: true
  },
  {
    id: 6,
    name: 'Budget Single Room',
    description: 'No-fuss, clean and cozy single room — all you need for a restful night in Diphu.',
    price: 800,
    image_url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&q=75',
    available: true
  }
];

function renderDemoRooms(container, limit) {
  const rooms = limit > 0 ? DEMO_ROOMS.slice(0, limit) : DEMO_ROOMS;
  renderRoomList(container, rooms);
  updateRoomStats(DEMO_ROOMS);
}

/* ── Realtime subscription ─────────────────────────────────── */
function subscribeRooms(containerId) {
  if (!_supabase) return;

    _supabase
    .channel('rooms-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
      // Re-fetch and re-render on any change
      loadRooms(containerId);
      showToast('Room data updated in real-time ✦', 'success');
    })
    .subscribe();
}

/* ── Filter buttons (rooms page) ─────────────────────────── */
function initRoomFilters() {
  const btns = document.querySelectorAll('.filter-btn');
  const container = document.getElementById('rooms-container');
  if (!btns.length || !container) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const cards = container.querySelectorAll('.room-card');

      cards.forEach(card => {
        const badge = card.querySelector('.room-card-badge');
        if (!badge) return;
        const isAvail = badge.classList.contains('badge-available');

        if (filter === 'all') {
          card.style.display = '';
        } else if (filter === 'available') {
          card.style.display = isAvail ? '' : 'none';
        } else if (filter === 'booked') {
          card.style.display = !isAvail ? '' : 'none';
        }
      });
    });
  });
}

/* ============================================================
   BOOKING MODAL
   ============================================================ */
function initBookingButtons() {
  document.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = btn.dataset.id;
      const name  = btn.dataset.name;
      const price = btn.dataset.price;
      openBookingModal(id, name, price);
    });
  });
}

async function openBookingModal(id, name, price) {
  const overlay = document.getElementById('booking-modal');
  if (!overlay) return;

  // ── Auth gate: redirect to login if not signed in ──
  const session = await getSession();
  if (!isLoggedIn(session)) {
    // Save intended room info so we can reopen after login
    sessionStorage.setItem('hambi_booking_redirect', window.location.href);
    sessionStorage.setItem('hambi_pending_room', JSON.stringify({ id, name, price }));

    // Show a friendly modal notice instead of hard redirect
    overlay.querySelector('.room-preview-name').textContent = '';
    const bm = overlay.querySelector('#bm-price');
    if (bm) bm.textContent = '';

    // Inject auth-gate content
    const inner = overlay.querySelector('.booking-modal');
    const originalHTML = inner.innerHTML;
    inner.dataset.originalHtml = originalHTML;
    inner.innerHTML = `
      <button class="modal-close" onclick="closeBookingModal()">✕</button>
      <div class="auth-gate-notice">
        <div class="auth-gate-icon">🔑</div>
        <h3>Sign In to Book</h3>
        <p>Create a free account or sign in to reserve <strong style="color:var(--gold)">${escapeHtml(name)}</strong> and manage your booking.</p>
        <a href="auth.html?tab=signup" class="btn btn-gold">✦ &nbsp;Create Free Account</a>
        <a href="auth.html?tab=login"  class="btn btn-outline">Sign In</a>
      </div>`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    return;
  }

  // ── Logged in — show normal booking form ──
  const inner = overlay.querySelector('.booking-modal');
  // Restore original HTML if it was replaced by auth gate
  if (inner.dataset.originalHtml) {
    inner.innerHTML = inner.dataset.originalHtml;
    delete inner.dataset.originalHtml;
    initBookingModal(); // re-attach listeners
  }

  overlay.querySelector('.room-preview-name').textContent = name;
  overlay.querySelector('#bm-price').textContent =
    '₹' + Number(price).toLocaleString('en-IN') + ' / night';

  // Pre-fill name from session
  const nameInput = overlay.querySelector('input[name="name"]');
  if (nameInput && !nameInput.value) {
    nameInput.value = getUserDisplayName(session) || '';
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function initBookingModal() {
  const overlay = document.getElementById('booking-modal');
  if (!overlay) return;

  overlay.querySelector('.modal-close').addEventListener('click', closeBookingModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeBookingModal();
  });

  const form = overlay.querySelector('#booking-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      showToast('Booking request received! We\'ll call you shortly. ✦', 'success');
      closeBookingModal();
      form.reset();
    });
  }
}

function closeBookingModal() {
  const overlay = document.getElementById('booking-modal');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ============================================================
   CONTACT FORM
   ============================================================ */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    // Simulate send (replace with actual email / Supabase insert)
    await sleep(1200);

    const success = form.nextElementSibling;
    if (success && success.classList.contains('form-success')) {
      form.style.display = 'none';
      success.style.display = 'block';
    } else {
      showToast('Message sent successfully! We\'ll be in touch. ✦', 'success');
      form.reset();
      btn.textContent = 'Send Message';
      btn.disabled = false;
    }
  });
}

/* ============================================================
   GALLERY LIGHTBOX (minimal)
   ============================================================ */
function initGallery() {
  const items = document.querySelectorAll('.gallery-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(6,15,20,.95);
        z-index:9000;display:flex;align-items:center;justify-content:center;
        cursor:pointer;backdrop-filter:blur(4px);
      `;
      const image = document.createElement('img');
      image.src = img.src;
      image.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;';
      overlay.appendChild(image);
      overlay.addEventListener('click', () => document.body.removeChild(overlay));
      document.body.appendChild(overlay);
    });
  });
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'success') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3800);
}

/* ============================================================
   UTILITY HELPERS
   ============================================================ */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/* ============================================================
   PAGE INIT — auto-detect page and run relevant code
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Always init
  initNavbar();
  initScrollAnimations();
  initBookingModal();

  // Init Supabase
  await initSupabase();

  // Init auth — get session and update navbar
  const session = await getSession();
  await initAuthNavbar(session);

  // After auth redirect — check if there's a pending room booking
  const pendingRoom = sessionStorage.getItem('hambi_pending_room');
  if (pendingRoom && isLoggedIn(session)) {
    sessionStorage.removeItem('hambi_pending_room');
    try {
      const { id, name, price } = JSON.parse(pendingRoom);
      setTimeout(() => openBookingModal(id, name, price), 600);
    } catch(e) {}
  }

  const page = window.location.pathname.split('/').pop() || 'index.html';

  if (page === 'index.html' || page === '') {
    await loadRooms('rooms-preview-grid', 3);
    subscribeRooms('rooms-preview-grid');
    initGallery();

  } else if (page === 'rooms.html') {
    await loadRooms('rooms-container', 0);
    subscribeRooms('rooms-container');
    initRoomFilters();

  } else if (page === 'contact.html') {
    initContactForm();

  } else if (page === 'admin.html') {
    // Admin page has its own init in admin.html inline script
  }

  // Update current year in footer
  document.querySelectorAll('.current-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});
