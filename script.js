/* ══════════════════════════════════════
   TRIVIDHYA'26 — Dynamic Script (Supabase)
   ══════════════════════════════════════ */

let ALL_EVENTS = [];
let ALL_GAMES = [];
let ALL = [];

/* ── Apply cached navbar title to loader SYNCHRONOUSLY (before animation starts) ── */
(function applyCachedLoaderTitle() {
    const cached = localStorage.getItem('siteNavbarTitle');
    if (cached) {
        const loaderH2 = document.querySelector('#loader h2');
        if (loaderH2) {
            loaderH2.innerHTML = cached.split('').map(ch => `<span>${ch}</span>`).join('');
        }
        const logoEl = document.getElementById('mainLogo');
        if (logoEl) logoEl.textContent = cached;
    }
})();

/* ── Load Site Settings from Supabase (async — updates everything except loader) ── */
async function loadSiteSettings() {
    try {
        const settings = await getSiteSettings();
        if (!settings) return;

        // Cache navbar title for next page load's loader
        if (settings.navbar_title) {
            localStorage.setItem('siteNavbarTitle', settings.navbar_title);
            const logoEl = document.getElementById('mainLogo');
            if (logoEl) logoEl.textContent = settings.navbar_title;
        }

        // Update Hero Title (parse "TECH-FIESTA'26" -> "TECH<span>-FIESTA</span>'26" pattern)
        if (settings.hero_title) {
            const heroH1 = document.querySelector('.hero-content h1');
            if (heroH1) {
                const title = settings.hero_title;
                const dashIdx = title.indexOf('-');
                if (dashIdx !== -1) {
                    const before = title.substring(0, dashIdx);
                    const rest = title.substring(dashIdx);
                    const match = rest.match(/^(-[A-Za-z]+)(.*)/);
                    if (match) {
                        heroH1.innerHTML = `${before}<span>${match[1]}</span>${match[2]}`;
                    } else {
                        heroH1.innerHTML = `${before}<span>${rest}</span>`;
                    }
                } else {
                    heroH1.textContent = title;
                }
            }
        }

        // Update Event Dates & Venue
        const heroDate = document.querySelector('.hero-date');
        if (heroDate) {
            const dates = settings.event_dates || 'March 23 & 25, 2026';
            const venue = settings.event_venue || 'GEC Dahod';
            heroDate.innerHTML = `
                <i class="fas fa-calendar-alt"></i> ${dates}
                &nbsp;&nbsp;
                <i class="fas fa-map-marker-alt"></i> ${venue}
            `;
        }

        // Also update the page title
        if (settings.navbar_title) {
            document.title = `${settings.navbar_title} | Tech Fiesta`;
        }
    } catch (err) {
        console.error('Error loading site settings:', err);
    }
}

// Load settings immediately
loadSiteSettings();

/* ── Load Events from Supabase ── */
async function loadEvents() {
    const events = await getAllEvents();
    // Sort ALL events alphabetically
    events.sort((a, b) => a.title.localeCompare(b.title));
    ALL_EVENTS = events.filter(e => e.category === 'tech' || e.category === 'nontech');
    ALL_GAMES = events.filter(e => e.category === 'game');
    ALL = events;

    // Populate event admin dropdown
    populateEventDropdown(events);

    return events;
}

function populateEventDropdown(events) {
    const sel = document.getElementById('eaEventSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select an event —</option>';
    // Already sorted alphabetically from loadEvents
    events.forEach(ev => {
        const opt = document.createElement('option');
        opt.value = ev.id;
        opt.textContent = ev.title;
        sel.appendChild(opt);
    });
}

/* ── Helper: build logo HTML ── */
function buildLogoHtml(ev) {
    if (!ev.logo_url) return '<i class="fas fa-trophy" style="font-size:3rem;color:var(--accent);"></i>';
    return `<img src="${ev.logo_url}" style="width:100px;height:100px;object-fit:cover;border-radius:15px;box-shadow:0 4px 15px rgba(0,0,0,0.5);" alt="${ev.title}">`;
}

/* ── Helper: team text ── */
function teamText(ev) {
    if (ev.max_members <= 1) return 'Solo';
    return ev.max_members + ' Members';
}

/* ── Helper: fee text ── */
function feeText(ev) {
    if (!ev.fee || ev.fee === 0) return 'Free';
    return '₹' + ev.fee;
}

/* ── Hero Mouse Tracking ── */
const hero = document.getElementById('home');
if (hero && !/Mobi|Android/i.test(navigator.userAgent)) {
    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        hero.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
}

/* ── Card Mouse Tracking ── */
if (!/Mobi|Android/i.test(navigator.userAgent)) {
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.event-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });
}

/* ── Floating Particles ── */
(function spawnParticles() {
    // Particles disabled
})();

/* ── Countdown ── */
function tick() {
    const target = new Date('2026-03-23T10:00:00');
    const now    = new Date();
    const diff   = target - now;
    const pad    = n => String(Math.max(0, Math.floor(n))).padStart(2,'0');
    if (diff <= 0) {
        ['d','h','m','s'].forEach(k => document.getElementById('cd-'+k).textContent = '00');
        return;
    }

    const updates = [
        { id: 'cd-d', val: pad(diff / 86400000) },
        { id: 'cd-h', val: pad((diff % 86400000) / 3600000) },
        { id: 'cd-m', val: pad((diff % 3600000)  / 60000) },
        { id: 'cd-s', val: pad((diff % 60000)    / 1000) }
    ];

    updates.forEach(({ id, val }) => {
        const el = document.getElementById(id);
        if (el.textContent !== val) {
            el.textContent = val;
            el.classList.remove('tick-vert');
            void el.offsetWidth;
            el.classList.add('tick-vert');
        }
    });
}
tick(); setInterval(tick, 1000);

/* ── Skeleton ── */
function showSkeletons(n) {
    const g = document.getElementById('skelGrid');
    g.innerHTML = Array(n).fill(`
        <div class="sk-card">
            <div class="skeleton sk-img"></div>
            <div class="sk-body">
                <div class="skeleton sk-title"></div>
                <div class="skeleton sk-line"></div>
                <div class="skeleton sk-line"></div>
                <div class="skeleton sk-line-s"></div>
                <div class="skeleton sk-btn"></div>
            </div>
        </div>`).join('');
}

/* ── Render Cards (Supabase format) ── */
function renderCards(data, gridId) {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const g = document.getElementById(gridId);
    g.innerHTML = data.map((ev, i) => `
        <div class="event-card" ${isMobile ? '' : `data-aos="zoom-in" data-aos-delay="${Math.min(i*50, 400)}"`} data-cat="${ev.category}" data-type="${ev.type || ''}" onclick="openModal('${ev.id}')">
            <div class="card-img">
                <span style="position:relative;z-index:1;display:flex;justify-content:center;align-items:center;width:100%;height:100%;">${buildLogoHtml(ev)}</span>
                <span class="card-badge" style="color:${ev.color};border-color:${ev.color}50;">${ev.badge}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${ev.title}</div>
                <div class="card-meta">
                    <span><i class="fas fa-users"></i>${teamText(ev)}</span>
                    <span style="display:${ev.fee ? 'flex' : 'none'}"><i class="fas fa-ticket-alt"></i>Fee: ${feeText(ev)}</span>
                </div>
                <div class="card-btn" onclick="openModal('${ev.id}'); event.stopPropagation()">
                    <i class="fas fa-info-circle"></i> Click here to know more
                </div>
            </div>
        </div>`).join('');
    
    // Initialize Vanilla Tilt
    if (typeof VanillaTilt !== 'undefined' && !isMobile) {
        VanillaTilt.init(g.querySelectorAll(".event-card"), {
            max: 15, speed: 400, glare: true, "max-glare": 0.2,
        });
    }
    
    observe();
    if (typeof AOS !== 'undefined' && !isMobile) AOS.refresh();
}

/* ── Pagination State ── */
let currentCat = 'all';
let currentSubType = 'all';
let evPage = 1;
let gmPage = 1;
const PER_PAGE = 8;

/* ── Filtered Events ── */
function getFilteredEvents() {
    const searchVal = (document.getElementById('eventSearchInput')?.value || '').toLowerCase().trim();
    return ALL_EVENTS.filter(ev => {
        const catMatch = (currentCat === 'all' || ev.category === currentCat);
        const typeMatch = (currentSubType === 'all' || ev.type === currentSubType);
        const title = (ev.title || '').toLowerCase();
        const desc = (ev.description || '').toLowerCase();
        const searchMatch = !searchVal || title.includes(searchVal) || desc.includes(searchVal);
        return catMatch && typeMatch && searchMatch;
    });
}

/* ── Render Events Section ── */
function renderEventsSection() {
    const filtered = getFilteredEvents();
    const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
    if (evPage > totalPages) evPage = 1;
    if (evPage < 1) evPage = 1;

    const startIdx = (evPage - 1) * PER_PAGE;
    const pageData = filtered.slice(startIdx, startIdx + PER_PAGE);

    renderCards(pageData, 'evGrid');
    renderPaginationUI('evPagination', totalPages, evPage, (newPage) => {
        evPage = newPage;
        renderEventsSection();
        const evSec = document.getElementById('events');
        if (evSec) evSec.scrollIntoView({ behavior: 'smooth' });
    });
}

/* ── Render Games Section ── */
function renderGamesSection() {
    const totalPages = Math.ceil(ALL_GAMES.length / PER_PAGE) || 1;
    if (gmPage > totalPages) gmPage = 1;
    if (gmPage < 1) gmPage = 1;

    const startIdx = (gmPage - 1) * PER_PAGE;
    const pageData = ALL_GAMES.slice(startIdx, startIdx + PER_PAGE);

    renderCards(pageData, 'gmGrid');
    renderPaginationUI('gmPagination', totalPages, gmPage, (newPage) => {
        gmPage = newPage;
        renderGamesSection();
        const gmSec = document.getElementById('games');
        if (gmSec) gmSec.scrollIntoView({ behavior: 'smooth' });
    });
}

/* ── Render Pagination UI ── */
function renderPaginationUI(containerId, totalPages, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<div class="pagination-wrapper">`;
    
    const prevDisabled = currentPage === 1;
    html += `<button class="page-btn prev-btn ${prevDisabled ? 'disabled' : ''}" ${prevDisabled ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Prev
             </button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-num ${i === currentPage ? 'active' : ''}">${i}</button>`;
    }

    const nextDisabled = currentPage === totalPages;
    html += `<button class="page-btn next-btn ${nextDisabled ? 'disabled' : ''}" ${nextDisabled ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
             </button>`;

    html += `</div>`;
    container.innerHTML = html;

    const prevBtn = container.querySelector('.prev-btn');
    if (prevBtn && !prevDisabled) {
        prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
    }

    const nextBtn = container.querySelector('.next-btn');
    if (nextBtn && !nextDisabled) {
        nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
    }

    container.querySelectorAll('.page-num').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pageNum = parseInt(e.target.textContent, 10);
            if (pageNum !== currentPage) {
                onPageChange(pageNum);
            }
        });
    });
}

/* ── Load with skeleton delay ── */
showSkeletons(6);
Promise.all([loadEvents(), loadCombos()]).then(() => {
    document.getElementById('skelGrid').style.display = 'none';
    document.getElementById('evGrid').style.display   = 'grid';
    renderEventsSection();
    renderGamesSection();
});

let ALL_COMBOS = [];

async function loadCombos() {
    ALL_COMBOS = await getAllCombos();
    renderCombosSection();
}

function renderCombosSection() {
    const section = document.getElementById('combosSection');
    const grid = document.getElementById('combosGrid');
    
    if (ALL_COMBOS.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    
    grid.innerHTML = ALL_COMBOS.map((combo, i) => `
        <div class="event-card" style="border: 1px solid var(--gold); background: rgba(255, 215, 0, 0.05);" ${isMobile ? '' : `data-aos="zoom-in" data-aos-delay="${Math.min(i*50, 400)}"`} onclick="window.location.href='register.html?combo_id=${combo.id}'">
            <div class="card-img" style="height: 120px; display:flex; justify-content:center; align-items:center; background: ${combo.image_url ? 'url(' + combo.image_url + ') center/cover' : 'rgba(0,0,0,0.5)'};">
                ${!combo.image_url ? '<i class="fas fa-layer-group" style="font-size: 3rem; color: var(--gold);"></i>' : ''}
                <span class="card-badge" style="color:#000; background: var(--gold); border:none; font-weight:bold;">COMBO DEAL</span>
            </div>
            <div class="card-body">
                <div class="card-title" style="color: var(--gold);">${combo.name}</div>
                <div style="font-size: 0.85rem; color: var(--muted); margin-bottom: 0.8rem; line-height: 1.4;">${combo.description || 'Special multi-event package'}</div>
                <div class="card-meta">
                    <span><i class="fas fa-users"></i>${combo.min_members === combo.max_members ? combo.max_members : combo.min_members + '-' + combo.max_members} Members</span>
                    <span style="color: #2ed573; font-weight: bold;"><i class="fas fa-ticket-alt"></i>₹${combo.total_fee}</span>
                </div>
                <div class="card-btn" style="background: var(--gold); color: #000; border-radius: 8px; border:none; font-weight:bold;">
                    <i class="fas fa-bolt"></i> Register Combo
                </div>
            </div>
        </div>`).join('');
        
    if (typeof VanillaTilt !== 'undefined' && !isMobile) {
        VanillaTilt.init(grid.querySelectorAll(".event-card"), {
            max: 15, speed: 400, glare: true, "max-glare": 0.2,
        });
    }
}

/* ── Filter ── */
function filterEvent(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = cat;
    currentSubType = 'all';

    const subFilters = document.getElementById('subFilters');
    subFilters.classList.add('show');
    document.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
    const firstSubBtn = document.querySelector('.sub-filter-btn');
    if (firstSubBtn) firstSubBtn.classList.add('active');

    evPage = 1;
    renderEventsSection();
}

function filterSubType(type, btn) {
    document.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSubType = type;
    evPage = 1;
    renderEventsSection();
}

function applyFilters() {
    evPage = 1;
    renderEventsSection();
}

/* ── Modal ── */
function openModal(id) {
    const ev = ALL.find(e => e.id === id);
    if (!ev) return;
    document.getElementById('mEmoji').innerHTML  = buildLogoHtml(ev);
    document.getElementById('mTitle').textContent  = ev.title;
    document.getElementById('mDesc').textContent   = ev.description;
    document.getElementById('mFee').textContent    = feeText(ev);
    document.getElementById('mTeam').textContent   = teamText(ev);
    const coordEl = document.getElementById('mCoords');
    const volunEl = document.getElementById('mVolunteers');
    if (coordEl) coordEl.textContent = ev.coordinators || 'TBA';
    if (volunEl) volunEl.textContent = ev.volunteers || 'TBA';
    document.getElementById('mLink').href          = `register.html?id=${ev.id}`;
    document.getElementById('mLink').removeAttribute('target');
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function closeOnBg(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
}

/* ── Hamburger ── */
function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('open');
}
document.querySelectorAll('.nav-links a').forEach(a =>
    a.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open'))
);

/* ── Scroll Reveal ── */
function observe() {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) return; // Disable scroll reveal on mobile for performance
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
}
observe();

/* ── Navbar shrink on scroll ── */
window.addEventListener('scroll', () => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) {
        document.getElementById('navbar').style.padding = window.scrollY > 50 ? '0.6rem 2rem' : '1rem 2rem';
    }
});

/* ── Loader ── */
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('progressBar');
    const letters = Array.from(loader.querySelectorAll('h2 span'));
    const progressThresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 97, 100];

    let progress = 0;
    progressBar.style.width = '0%';

    const interval = setInterval(() => {
        progress = Math.min(100, progress + 1);
        progressBar.style.width = progress + '%';

        letters.forEach((letter, index) => {
            if (progress >= progressThresholds[index]) {
                letter.classList.add('visible');
            }
        });

        if (progress >= 100) {
            clearInterval(interval);

            setTimeout(() => {
                const loaderH2 = loader.querySelector('h2');
                const navLogo = document.querySelector('.logo');
                const rectHero = loaderH2.getBoundingClientRect();
                const rectTarget = navLogo.getBoundingClientRect();
                const scale = rectTarget.height / rectHero.height;
                const translateX = rectTarget.left - rectHero.left;
                const translateY = rectTarget.top - rectHero.top;

                loaderH2.style.transformOrigin = 'top left';
                loaderH2.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s 0.8s';
                loaderH2.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                loaderH2.style.opacity = '0';

                navLogo.classList.add('pop');
                loader.classList.add('hidden');
            }, 300);
        }
    }, 15);
});

/* ── Active Link Highlight ── */
const sections = document.querySelectorAll('section, footer');
const navLinksAnchors = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= (sectionTop - window.innerHeight / 3)) {
            current = section.getAttribute('id');
        }
    });
    navLinksAnchors.forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('href') === '#' + current) a.classList.add('active');
    });
});

AOS.init({ 
    duration: 800, 
    once: true,
    disable: /Mobi|Android/i.test(navigator.userAgent) // Disable AOS on mobile for better performance
});

/* ══════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
   ══════════════════════════════════════ */

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ══════════════════════════════════════
   CUSTOM CONFIRM DIALOG
   ══════════════════════════════════════ */

let confirmResolver = null;

function showConfirmDialog({ title = 'Are you sure?', desc = '', icon = '⚠️', okText = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
        confirmResolver = resolve;
        document.getElementById('confirmIcon').textContent = icon;
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmDesc').textContent = desc;
        document.getElementById('confirmOk').textContent = okText;
        const okBtn = document.getElementById('confirmOk');
        okBtn.className = danger ? 'confirm-ok danger' : 'confirm-ok';
        document.getElementById('confirmDialog').classList.add('open');
    });
}

function closeConfirm(result) {
    document.getElementById('confirmDialog').classList.remove('open');
    if (confirmResolver) {
        confirmResolver(result);
        confirmResolver = null;
    }
}

/* ══════════════════════════════════════
   ADMIN LOGIN — Keyboard & URL Shortcuts
   ══════════════════════════════════════ */

// Auto-open login modal if URL contains ?login=admin or #admin
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const loginParam = (urlParams.get('login') || window.location.hash.replace('#', '')).toLowerCase();
    if (loginParam === 'admin' || loginParam === 'superadmin') {
        document.getElementById('mainAdminModal')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    } else if (loginParam === 'eventadmin') {
        document.getElementById('eventAdminModal')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // Initialize Hamburger 3-Bar Navigation
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');
    const navbar = document.getElementById('navbar');

    if (hamburgerBtn && navLinks) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerBtn.classList.toggle('active');
            navLinks.classList.toggle('open');
            if (navbar) navbar.classList.toggle('open');
            const icon = hamburgerBtn.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('open')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-xmark');
                } else {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking navigation links
        document.querySelectorAll('#navLinks .nav-icon-link:not(.mobile-login-toggle)').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                if (navbar) navbar.classList.remove('open');
                hamburgerBtn.classList.remove('active');
                const icon = hamburgerBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            });
        });

        // Close menu on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#navbar')) {
                navLinks.classList.remove('open');
                if (navbar) navbar.classList.remove('open');
                hamburgerBtn.classList.remove('active');
                const icon = hamburgerBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
                const dropdown = document.getElementById('mobileLoginDropdown');
                if (dropdown) {
                    dropdown.classList.remove('open');
                    dropdown.classList.remove('show');
                }
            }
        });
    }
});

// Global Keyboard Shortcuts:
// Press Ctrl + Shift + A (or Ctrl + Shift + S) -> Super Admin Login
// Press Ctrl + Shift + E -> Event Admin Login
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        document.getElementById('mainAdminModal')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        document.getElementById('eventAdminModal')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
});

/* ── Event Admin Login ── */
async function loginEventAdmin() {
    const eventId = document.getElementById('eaEventSelect').value;
    const password = document.getElementById('eaPassword').value;
    const errEl = document.getElementById('eaError');
    const btn = document.querySelector('#eventAdminModal .admin-login-btn');

    if (!eventId) {
        errEl.textContent = 'Please select an event';
        return;
    }
    if (!password) {
        errEl.textContent = 'Please enter the password';
        return;
    }

    // Show loading
    btn.querySelector('.admin-btn-text').style.display = 'none';
    btn.querySelector('.admin-btn-loader').style.display = 'inline-flex';
    btn.disabled = true;
    errEl.textContent = '';

    const valid = await verifyEventAdminPassword(eventId, password);

    btn.querySelector('.admin-btn-text').style.display = 'inline-flex';
    btn.querySelector('.admin-btn-loader').style.display = 'none';
    btn.disabled = false;

    if (valid) {
        showToast('Login successful! Redirecting...', 'success');
        sessionStorage.setItem('eventAdminId', eventId);
        setTimeout(() => { window.location.href = 'event_admin.html?id=' + eventId; }, 500);
    } else {
        errEl.textContent = 'Invalid password!';
        // Shake the card
        const card = btn.closest('.admin-login-card');
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = 'shake 0.4s ease';
        setTimeout(() => card.style.animation = '', 400);
    }
}

/* ══════════════════════════════════════
   MOBILE LOGIN HELPERS
   ══════════════════════════════════════ */

function toggleMobileLoginMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = document.getElementById('mobileLoginDropdown');
    dropdown.classList.toggle('open');
    dropdown.classList.toggle('show');
}

function openEventAdminFromMobile(e) {
    e.preventDefault();
    document.getElementById('navLinks').classList.remove('open');
    document.getElementById('navbar')?.classList.remove('open');
    document.getElementById('mobileLoginDropdown').classList.remove('open');
    document.getElementById('mobileLoginDropdown').classList.remove('show');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
        hamburgerBtn.classList.remove('active');
        const icon = hamburgerBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    }
    document.getElementById('eventAdminModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function openMainAdminFromMobile(e) {
    e.preventDefault();
    document.getElementById('navLinks').classList.remove('open');
    document.getElementById('navbar')?.classList.remove('open');
    document.getElementById('mobileLoginDropdown').classList.remove('open');
    document.getElementById('mobileLoginDropdown').classList.remove('show');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
        hamburgerBtn.classList.remove('active');
        const icon = hamburgerBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    }
    document.getElementById('mainAdminModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

/* ── Main Admin Login (Supabase Auth with MFA) ── */
async function loginMainAdmin() {
    const email = document.getElementById('maEmail').value.trim();
    const password = document.getElementById('maPassword').value;
    const errEl = document.getElementById('maError');
    const btn = document.querySelector('#maLoginForm .admin-login-btn');

    if (!email || !password) {
        errEl.textContent = 'Please enter email and password';
        return;
    }

    btn.querySelector('.admin-btn-text').style.display = 'none';
    btn.querySelector('.admin-btn-loader').style.display = 'inline-flex';
    btn.disabled = true;
    errEl.textContent = '';

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    btn.querySelector('.admin-btn-text').style.display = 'inline-flex';
    btn.querySelector('.admin-btn-loader').style.display = 'none';
    btn.disabled = false;

    if (error) {
        errEl.textContent = error.message;
        const card = btn.closest('.admin-login-card');
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = 'shake 0.4s ease';
        setTimeout(() => card.style.animation = '', 400);
        return;
    }

    // Check MFA status
    const { data: mfaLevel, error: mfaError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (mfaLevel && mfaLevel.currentLevel !== 'aal2') {
        // Needs MFA
        const { data: factors } = await supabaseClient.auth.mfa.listFactors();
        const totpFactor = factors?.totp[0];

        if (!totpFactor || totpFactor.status === 'unverified') {
            // Needs Enrollment
            document.getElementById('maLoginForm').style.display = 'none';
            document.getElementById('maEnrollForm').style.display = 'block';
            
            const enroll = await supabaseClient.auth.mfa.enroll({ factorType: 'totp' });
            if (enroll.error) {
                document.getElementById('maEnrollError').textContent = enroll.error.message;
                return;
            }
            document.getElementById('maEnrollFactorId').value = enroll.data.id;
            
            // Generate QR Code
            document.getElementById('qrcode').innerHTML = '';
            new QRCode(document.getElementById('qrcode'), {
                text: enroll.data.totp.uri,
                width: 150,
                height: 150
            });
        } else {
            // Needs Verification
            document.getElementById('maLoginForm').style.display = 'none';
            document.getElementById('maMfaForm').style.display = 'block';
            
            const challenge = await supabaseClient.auth.mfa.challenge({ factorId: totpFactor.id });
            if (challenge.error) {
                document.getElementById('maOtpError').textContent = challenge.error.message;
                return;
            }
            document.getElementById('maFactorId').value = totpFactor.id;
        }
    } else {
        // Already logged in fully (maybe from previous session or AAL1 is enough if no MFA setup)
        finishMainAdminLogin();
    }
}

async function verifyMainAdminOtp() {
    const otp = document.getElementById('maOtp').value.trim();
    const factorId = document.getElementById('maFactorId').value;
    const errEl = document.getElementById('maOtpError');
    const btn = document.querySelector('#maMfaForm .admin-login-btn');

    if (otp.length !== 6) {
        errEl.textContent = 'Please enter a 6-digit code';
        return;
    }

    btn.querySelector('.admin-btn-text').style.display = 'none';
    btn.querySelector('.admin-btn-loader').style.display = 'inline-flex';
    btn.disabled = true;
    errEl.textContent = '';

    const verify = await supabaseClient.auth.mfa.verify({
        factorId,
        challengeId: (await supabaseClient.auth.mfa.challenge({ factorId })).data.id,
        code: otp
    });

    btn.querySelector('.admin-btn-text').style.display = 'inline-flex';
    btn.querySelector('.admin-btn-loader').style.display = 'none';
    btn.disabled = false;

    if (verify.error) {
        errEl.textContent = 'Invalid OTP code';
    } else {
        finishMainAdminLogin();
    }
}

async function verifyMainAdminEnrollment() {
    const otp = document.getElementById('maEnrollOtp').value.trim();
    const factorId = document.getElementById('maEnrollFactorId').value;
    const errEl = document.getElementById('maEnrollError');
    const btn = document.querySelector('#maEnrollForm .admin-login-btn');

    if (otp.length !== 6) {
        errEl.textContent = 'Please enter a 6-digit code';
        return;
    }

    btn.querySelector('.admin-btn-text').style.display = 'none';
    btn.querySelector('.admin-btn-loader').style.display = 'inline-flex';
    btn.disabled = true;
    errEl.textContent = '';

    const challenge = await supabaseClient.auth.mfa.challenge({ factorId });
    if (challenge.error) {
        errEl.textContent = challenge.error.message;
        btn.querySelector('.admin-btn-text').style.display = 'inline-flex';
        btn.querySelector('.admin-btn-loader').style.display = 'none';
        btn.disabled = false;
        return;
    }

    const verify = await supabaseClient.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: otp
    });

    btn.querySelector('.admin-btn-text').style.display = 'inline-flex';
    btn.querySelector('.admin-btn-loader').style.display = 'none';
    btn.disabled = false;

    if (verify.error) {
        errEl.textContent = 'Invalid OTP code';
    } else {
        finishMainAdminLogin();
    }
}

function finishMainAdminLogin() {
    showToast('Super Admin login successful!', 'success');
    sessionStorage.setItem('mainAdmin', 'true');
    setTimeout(() => { window.location.href = 'admin.html'; }, 500);
}
