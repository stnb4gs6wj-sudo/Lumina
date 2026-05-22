/* ═══════════════════════════════════════════════════════════════
   LUMINA — ui.js
   UI-Rendering-Schicht: Alle DOM-Operationen, View-Wechsel,
   Modals, Toast-Benachrichtigungen, Statistik-Anzeige.
   Nutzt ausschließlich Funktionen aus data.js.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   NAVIGATION & VIEW-WECHSEL
────────────────────────────────────────────────────────────── */

/** Aktuell aktive View */
let currentView = 'home';

/**
 * Wechselt zur angegebenen View.
 * Aktualisiert Nav-Highlighting und rendert die View-Inhalte.
 */
function switchView(viewName) {
  // Alle Views ausblenden
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Alle Nav-Items deaktivieren
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Neue View einblenden
  const view = document.getElementById(`view-${viewName}`);
  if (view) view.classList.add('active');

  // Nav-Item aktivieren
  const navItem = document.querySelector(`[data-view="${viewName}"]`);
  if (navItem) navItem.classList.add('active');

  currentView = viewName;

  // View-spezifisches Rendering
  switch (viewName) {
    case 'home':     renderHome();     break;
    case 'library':  renderLibrary();  break;
    case 'progress': renderProgress(); break;
    case 'garden':   renderGarden();   break;
    case 'settings': renderSettings(); break;
  }

  // Mobile Sidebar schließen
  closeMobileSidebar();
}

/* ──────────────────────────────────────────────────────────────
   THEME-MANAGEMENT
────────────────────────────────────────────────────────────── */

/**
 * Setzt das Theme (light/dark) und speichert die Einstellung.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveSettings({ theme });

  // Theme-Toggle-Button-Icon aktualisieren
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '◑' : '◐';

  // Settings-Toggle-Buttons synchronisieren
  document.querySelectorAll('[data-theme-btn]').forEach(b => {
    b.classList.toggle('active', b.dataset.themeBtn === theme);
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ──────────────────────────────────────────────────────────────
   STARTSEITE
────────────────────────────────────────────────────────────── */

function renderHome() {
  // Begrüßung & Datum
  const greetEl = document.getElementById('home-greeting');
  const dateEl  = document.getElementById('home-date');
  if (greetEl) greetEl.textContent = getGreeting();
  if (dateEl)  dateEl.textContent  = getTodayFormatted();

  // Motivation
  const motEl = document.getElementById('motivation-text');
  if (motEl) motEl.textContent = getRandomMotivation();

  // Statistik-Karten
  const stats = getTotalStats();
  setTextById('stat-streak',      stats.streak);
  setTextById('stat-cards-today', getCardsLearnedToday());
  setTextById('stat-flowers',     getGarden().flowers.length);
  setTextById('stat-total-decks', stats.totalDecks);
  setTextById('sidebar-streak',   stats.streak);

  // Tagesziel Ring
  renderGoalRing();

  // Klausur Countdown
  renderExamSection();

  // Schwierige Karten
  renderHardCards();
}

/**
 * Rendert den Fortschrittsring für das Tagesziel.
 */
function renderGoalRing() {
  const settings  = getSettings();
  const goal      = settings.dailyGoal || 20;
  const done      = getCardsLearnedToday();
  const pct       = Math.min(done / goal, 1);
  const circumf   = 2 * Math.PI * 52; // r=52

  const ring      = document.getElementById('goal-ring-fill');
  const doneEl    = document.getElementById('goal-done');
  const totalEl   = document.getElementById('goal-total');
  const goalInput = document.getElementById('goal-input');

  if (ring) {
    // stroke-dashoffset: voll = circumf (0%), leer = 0 (100%)
    ring.style.strokeDashoffset = circumf * (1 - pct);
  }
  if (doneEl)    doneEl.textContent  = done;
  if (totalEl)   totalEl.textContent = `/ ${goal}`;
  if (goalInput) goalInput.value     = goal;

  // Settings-Input synchron halten
  const sGoal = document.getElementById('settings-goal');
  if (sGoal) sGoal.value = goal;
}

/**
 * Rendert Klausur-Countdown und Liste.
 */
function renderExamSection() {
  const next = getNextExam();

  const daysEl = document.getElementById('exam-days');
  const nameEl = document.getElementById('exam-name-display');

  if (next) {
    const days = daysUntil(next.date);
    if (daysEl) daysEl.textContent = days === 0 ? 'Heute!' : `${days} Tage`;
    if (nameEl) nameEl.textContent = next.name;
  } else {
    if (daysEl) daysEl.textContent = '–';
    if (nameEl) nameEl.textContent = 'Keine Klausur eingetragen';
  }

  // Liste aller Klausuren
  const listEl = document.getElementById('exam-list');
  if (!listEl) return;

  const exams = getExams();
  if (exams.length === 0) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = exams.map(e => {
    const days = daysUntil(e.date);
    const label = days === 0 ? 'Heute' : days < 0 ? 'Vorbei' : `${days}d`;
    return `
      <div class="exam-item">
        <span>${e.name}</span>
        <span>${formatDate(e.date)} · ${label}</span>
        <span class="exam-del" data-exam-id="${e.id}" title="Löschen">✕</span>
      </div>
    `;
  }).join('');

  // Delete-Handler
  listEl.querySelectorAll('.exam-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteExam(btn.dataset.examId);
      renderExamSection();
    });
  });
}

/**
 * Rendert die schwierigsten Karten auf der Startseite.
 */
function renderHardCards() {
  const container = document.getElementById('hard-cards-list');
  if (!container) return;

  const hard = getHardestCards(5);

  if (hard.length === 0) {
    container.innerHTML = '<p class="empty-hint">Noch keine Bewertungen vorhanden. Fang an zu lernen!</p>';
    return;
  }

  container.innerHTML = hard.map(c => `
    <div class="hard-card-item">
      <span class="hard-card-front">${escapeHtml(c.front)}</span>
      <span class="hard-card-badge">${escapeHtml(c.deckName)}</span>
    </div>
  `).join('');
}

/* ──────────────────────────────────────────────────────────────
   BIBLIOTHEK
────────────────────────────────────────────────────────────── */

/** Aktuell geöffnetes Deck (für Modal) */
let activeDeckId = null;

/**
 * Rendert die Deck-Kacheln im Bibliothek-Grid.
 */
function renderLibrary(filter = '') {
  const grid     = document.getElementById('decks-grid');
  const emptyEl  = document.getElementById('library-empty');
  if (!grid) return;

  let decks = getDecks();

  // Sortierung
  const sortVal = document.getElementById('sort-select')?.value || 'name';
  if (sortVal === 'name')   decks = [...decks].sort((a,b) => a.name.localeCompare(b.name));
  if (sortVal === 'recent') decks = [...decks].sort((a,b) => (b.lastStudied || 0) - (a.lastStudied || 0));
  if (sortVal === 'cards')  decks = [...decks].sort((a,b) => b.cards.length - a.cards.length);

  // Suchfilter
  if (filter.trim()) {
    const q = filter.toLowerCase();
    decks = decks.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.cards.some(c => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q))
    );
  }

  // Leer-State
  if (emptyEl) {
    emptyEl.classList.toggle('hidden', decks.length > 0 || filter.trim() !== '');
  }

  if (decks.length === 0 && filter.trim() === '') {
    grid.innerHTML = '';
    return;
  }

  if (decks.length === 0) {
    grid.innerHTML = '<p class="empty-hint" style="padding:2rem;color:var(--text-muted)">Keine Ergebnisse für "' + escapeHtml(filter) + '"</p>';
    return;
  }

  grid.innerHTML = decks.map(deck => `
    <div class="deck-card" data-deck-id="${deck.id}" style="--deck-color:${deck.color}">
      <div class="deck-icon-wrap">${deck.icon}</div>
      <h3 class="deck-name">${escapeHtml(deck.name)}</h3>
      ${deck.description ? `<p class="deck-desc">${escapeHtml(deck.description)}</p>` : ''}
      <div class="deck-meta">
        <span class="deck-card-count">${deck.cards.length} Karten</span>
        <span>${deck.lastStudied ? 'Zuletzt: ' + timeAgo(deck.lastStudied) : 'Noch nicht gelernt'}</span>
      </div>
      <div class="deck-actions">
        <button class="deck-del-btn" data-deck-del="${deck.id}" title="Stapel löschen">✕ Löschen</button>
      </div>
    </div>
  `).join('');

  // Deck-Karte öffnen (Klick auf Kachel)
  grid.querySelectorAll('.deck-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Nicht auslösen wenn Delete-Button geklickt
      if (e.target.dataset.deckDel) return;
      openDeckDetail(card.dataset.deckId);
    });
  });

  // Delete-Buttons
  grid.querySelectorAll('[data-deck-del]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Stapel "${getDeckById(btn.dataset.deckDel)?.name}" wirklich löschen?`)) {
        deleteDeck(btn.dataset.deckDel);
        renderLibrary(filter);
        showToast('Stapel gelöscht');
      }
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   DECK-DETAIL MODAL
────────────────────────────────────────────────────────────── */

/**
 * Öffnet das Deck-Detail-Modal für ein Deck.
 */
function openDeckDetail(deckId) {
  const deck = getDeckById(deckId);
  if (!deck) return;

  activeDeckId = deckId;

  setTextById('deck-detail-title', deck.name);
  const sub = document.getElementById('deck-detail-sub');
  if (sub) sub.textContent = `${deck.cards.length} Karten · ${deck.description || ''}`;

  renderCardsList(deckId);
  openModal('modal-deck-detail');
}

/**
 * Rendert die Karten-Liste innerhalb des Deck-Detail-Modals.
 */
function renderCardsList(deckId) {
  const deck      = getDeckById(deckId);
  const container = document.getElementById('cards-list');
  if (!container || !deck) return;

  if (deck.cards.length === 0) {
    container.innerHTML = '<p class="empty-hint" style="padding:1rem">Noch keine Karten. Füge die erste hinzu!</p>';
    return;
  }

  const diffLabel = { 0: '', 1: '✦ Leicht', 2: '◈ Mittel', 3: '◆ Schwer' };
  const diffColor = { 0: 'var(--text-muted)', 1: 'var(--success)', 2: 'var(--warning)', 3: 'var(--danger)' };

  container.innerHTML = deck.cards.map(card => `
    <div class="card-item" data-card-id="${card.id}">
      <span class="card-item-front">${escapeHtml(card.front)}</span>
      <span class="card-item-back">${escapeHtml(card.back)}</span>
      <button class="card-del-btn" data-card-del="${card.id}" title="Karte löschen">✕</button>
    </div>
  `).join('');

  // Delete-Buttons
  container.querySelectorAll('[data-card-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteCardFromDeck(deckId, btn.dataset.cardDel);
      renderCardsList(deckId);
      // Sub-Titel aktualisieren
      const updatedDeck = getDeckById(deckId);
      const sub = document.getElementById('deck-detail-sub');
      if (sub && updatedDeck) sub.textContent = `${updatedDeck.cards.length} Karten · ${updatedDeck.description || ''}`;
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   DECK ERSTELLEN MODAL — Color Picker
────────────────────────────────────────────────────────────── */

let selectedDeckColor = DECK_COLORS[0].value;
let selectedDeckIcon  = DECK_ICONS[0];

/**
 * Rendert den Farb-Picker im "Neuen Stapel"-Modal.
 */
function renderColorPicker() {
  const row = document.getElementById('color-picker-row');
  if (!row) return;

  selectedDeckColor = DECK_COLORS[0].value;

  row.innerHTML = DECK_COLORS.map((c, i) => `
    <div class="color-dot ${i === 0 ? 'selected' : ''}"
         style="background:${c.value}"
         data-color="${c.value}"
         title="${c.name}">
    </div>
  `).join('');

  row.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      row.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      selectedDeckColor = dot.dataset.color;
    });
  });
}

/* ──────────────────────────────────────────────────────────────
   FORTSCHRITT VIEW
────────────────────────────────────────────────────────────── */

function renderProgress() {
  renderWeekChart();
  renderTotalStats();
  renderStreakCalendar();
}

/**
 * Rendert das Balkendiagramm der letzten 7 Tage.
 */
function renderWeekChart() {
  const container = document.getElementById('week-chart');
  if (!container) return;

  const days   = getActivityLastDays(7);
  const maxVal = Math.max(...days.map(d => d.count), 1);

  container.innerHTML = days.map(day => {
    const heightPct = (day.count / maxVal) * 100;
    return `
      <div class="week-bar-wrap">
        <span class="week-val">${day.count || ''}</span>
        <div class="week-bar ${day.isToday ? 'today' : ''}"
             style="height:${heightPct}%"
             title="${day.count} Karten am ${day.key}">
        </div>
        <span class="week-label">${day.label}</span>
      </div>
    `;
  }).join('');
}

/**
 * Rendert die Gesamtstatistik-Liste.
 */
function renderTotalStats() {
  const listEl = document.getElementById('total-stats-list');
  const bestEl = document.getElementById('best-streak-display');
  if (!listEl) return;

  const stats = getTotalStats();

  listEl.innerHTML = `
    <li><span class="stat-key">Stapel gesamt</span>    <span class="stat-val">${stats.totalDecks}</span></li>
    <li><span class="stat-key">Karten gesamt</span>    <span class="stat-val">${stats.totalCards}</span></li>
    <li><span class="stat-key">Gelernte Karten</span>  <span class="stat-val">${stats.totalLearned}</span></li>
    <li><span class="stat-key">Lerntage</span>         <span class="stat-val">${stats.learnedDays}</span></li>
    <li><span class="stat-key">Aktueller Streak</span> <span class="stat-val">${stats.streak}d</span></li>
  `;

  if (bestEl) bestEl.textContent = stats.bestStreak;
}

/**
 * Rendert den 10-Wochen-Kalender.
 */
function renderStreakCalendar() {
  const container = document.getElementById('streak-calendar');
  if (!container) return;

  const days = getCalendarDays(70);

  container.innerHTML = days.map(day => {
    let cls = 'cal-day';
    if (day.isToday) cls += ' today';
    if (day.count > 0) cls += ' learned';
    const opacity = day.count > 0 ? Math.min(0.4 + day.count / 30, 1) : '';
    return `<div class="${cls}"
                 title="${day.key}: ${day.count} Karten"
                 style="${opacity ? `opacity:${opacity}` : ''}">
            </div>`;
  }).join('');
}

/* ──────────────────────────────────────────────────────────────
   GARTEN VIEW
────────────────────────────────────────────────────────────── */

function renderGarden() {
  const grid = document.getElementById('garden-grid');
  if (!grid) return;

  const garden     = getGarden();
  const earned     = garden.flowers;
  const stats      = getTotalStats();
  const learnedDays = stats.learnedDays;

  // Zeige alle Blumen: verdiente + gesperrte (bis zu 12 slots)
  const totalSlots = Math.max(earned.length + 4, 12);
  const html       = [];

  for (let i = 0; i < totalSlots; i++) {
    const flower = earned[i];
    if (flower) {
      const rarityLabel = { common: '', uncommon: '✦', rare: '✦✦', legendary: '✦✦✦' };
      html.push(`
        <div class="flower-card" title="Verdient am Tag ${flower.day}">
          <span class="flower-emoji">${flower.emoji}</span>
          <div class="flower-name">${flower.name}</div>
          <div class="flower-day">${rarityLabel[flower.rarity] || ''} Tag ${flower.day}</div>
        </div>
      `);
    } else {
      // Gesperrte Blume: nächste Blume in X Tagen
      const daysNeeded = (i + 1) * 5;
      const daysLeft   = daysNeeded - learnedDays;
      html.push(`
        <div class="flower-card flower-locked" title="In ${daysLeft} Lerntagen freischaltbar">
          <span class="flower-emoji">🌱</span>
          <div class="flower-name">Gesperrt</div>
          <div class="flower-day">In ${daysLeft} Lerntag${daysLeft !== 1 ? 'en' : ''}</div>
        </div>
      `);
    }
  }

  grid.innerHTML = html.join('');

  // Garten-Animationen aus garden.js anwenden
  enhanceGardenCards();
}

/* ──────────────────────────────────────────────────────────────
   EINSTELLUNGEN VIEW
────────────────────────────────────────────────────────────── */

function renderSettings() {
  const settings = getSettings();

  // Theme-Buttons synchronisieren
  document.querySelectorAll('[data-theme-btn]').forEach(b => {
    b.classList.toggle('active', b.dataset.themeBtn === settings.theme);
  });

  // Ziel-Input
  const goalInput = document.getElementById('settings-goal');
  if (goalInput) goalInput.value = settings.dailyGoal;
}

/* ──────────────────────────────────────────────────────────────
   MODAL-SYSTEM
────────────────────────────────────────────────────────────── */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    // Ersten fokussierbaren Input fokussieren
    setTimeout(() => {
      const input = el.querySelector('input, textarea');
      if (input) input.focus();
    }, 50);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

/* ──────────────────────────────────────────────────────────────
   TOAST-BENACHRICHTIGUNGEN
────────────────────────────────────────────────────────────── */

let toastTimer = null;

/**
 * Zeigt einen kurzen Toast an.
 * @param {string} msg    Nachricht
 * @param {number} duration Dauer in ms (Standard: 2800)
 */
function showToast(msg, duration = 2800) {
  const toast  = document.getElementById('toast');
  const msgEl  = document.getElementById('toast-msg');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
}

/* ──────────────────────────────────────────────────────────────
   MOBILE SIDEBAR
────────────────────────────────────────────────────────────── */

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
}

function toggleMobileSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

/* ──────────────────────────────────────────────────────────────
   DOM-HILFSFUNKTIONEN
────────────────────────────────────────────────────────────── */

/** Setzt den Textinhalt eines Elements per ID. */
function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** HTML-Zeichen escapen (XSS-Schutz). */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gibt eine relative Zeitangabe zurück (z.B. "vor 2 Tagen").
 */
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'gerade eben';
  if (mins < 60)  return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'gestern';
  return `vor ${days} Tagen`;
}
