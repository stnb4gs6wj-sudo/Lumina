/* ═══════════════════════════════════════════════════════════════
   LUMINA — data.js (Firebase-Version)
   
   WICHTIGE ÄNDERUNG:
   Alle Daten werden jetzt DIREKT in Firebase Firestore gespeichert.
   localStorage wird nur noch als schneller Zwischenspeicher genutzt.
   
   Prinzip:
   - Lesen:    Zuerst localStorage (schnell), dann Firebase (aktuell)
   - Schreiben: Sofort localStorage + sofort Firebase
   - Beim Start: Firebase lädt alles herunter → localStorage aktualisieren
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   KONSTANTEN
────────────────────────────────────────────────────────────── */

const DECK_COLORS = [
  { name: 'Lila',     value: '#9b7fe8' },
  { name: 'Blau',     value: '#6da3d8' },
  { name: 'Teal',     value: '#5ec4b6' },
  { name: 'Rose',     value: '#d87fb0' },
  { name: 'Lavendel', value: '#b8a0f0' },
  { name: 'Silber',   value: '#a0a8c4' },
  { name: 'Indigo',   value: '#7264c8' },
  { name: 'Aqua',     value: '#60b4d4' },
];

const DECK_ICONS = ['📚','🌸','🔬','⚗️','🧬','📐','🌍','🎼','💡','🌿','🧠','✨'];

const MOTIVATIONS = [
  'Jede Karte bringt dich deinem Ziel näher.',
  'Wissen ist das einzige Gut, das wächst, wenn man es teilt.',
  'Kleine Schritte führen zu großen Zielen.',
  'Du bist heute besser als gestern — und morgen besser als heute.',
  'Lernen ist nicht Vorbereitung auf das Leben — Lernen ist das Leben.',
  'Konsistenz schlägt Perfektion jeden Tag.',
  'Dein zukünftiges Ich wird dir für heute danken.',
  'Das Geheimnis liegt in der Regelmäßigkeit.',
  'Eine Stunde täglich — ein Semester Vorsprung.',
];

const FLOWERS = [
  { emoji: '🌸', name: 'Kirschblüte',  rarity: 'common'   },
  { emoji: '🌷', name: 'Tulpe',        rarity: 'common'   },
  { emoji: '🌻', name: 'Sonnenblume',  rarity: 'common'   },
  { emoji: '🌼', name: 'Margerite',    rarity: 'common'   },
  { emoji: '💐', name: 'Blumenstrauß', rarity: 'uncommon' },
  { emoji: '🌺', name: 'Hibiskus',     rarity: 'uncommon' },
  { emoji: '🌹', name: 'Rose',         rarity: 'uncommon' },
  { emoji: '💜', name: 'Veilchen',     rarity: 'rare'     },
  { emoji: '🪷', name: 'Lotusblüte',   rarity: 'rare'     },
  { emoji: '🌿', name: 'Lavendel',     rarity: 'rare'     },
  { emoji: '⭐', name: 'Sternenblume', rarity: 'legendary'},
  { emoji: '🌙', name: 'Mondblüte',    rarity: 'legendary'},
];

/* ──────────────────────────────────────────────────────────────
   IN-MEMORY STORE
   
   Das ist der zentrale Datenspeicher während die App läuft.
   Beim Start wird er aus Firebase geladen.
   Bei jeder Änderung wird er sofort zu Firebase hochgeladen.
────────────────────────────────────────────────────────────── */

let _store = {
  decks:    [],
  settings: { theme: 'dark', dailyGoal: 20 },
  exams:    [],
  garden:   { flowers: [], totalDaysLearned: 0 },
  activity: {},
};

/* ──────────────────────────────────────────────────────────────
   FIREBASE-BRIDGE
   
   Diese Funktionen werden von index.html (Firebase-Modul) gesetzt.
   data.js selbst kennt Firebase nicht — es ruft nur diese
   Funktionen auf und Firebase kümmert sich um den Rest.
────────────────────────────────────────────────────────────── */

// Wird von index.html gesetzt sobald Firebase bereit ist
window._luminaFirebase = {
  save: async (key, value) => {
    // Fallback: localStorage wenn Firebase noch nicht bereit
    try {
      localStorage.setItem('lumina_' + key, JSON.stringify(value));
    } catch(e) {}
  },
  load: async (key) => {
    // Fallback: aus localStorage lesen
    try {
      const raw = localStorage.getItem('lumina_' + key);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },
  loadAll: async () => null,
};

/* ──────────────────────────────────────────────────────────────
   STORE LADEN (beim App-Start)
────────────────────────────────────────────────────────────── */

/**
 * Lädt alle Daten aus Firebase in den In-Memory-Store.
 * Wird von index.html nach erfolgreichem Login aufgerufen.
 */
async function loadStoreFromFirebase() {
  try {
    // index.html übergibt Daten direkt über window._store_*
    // (vermeidet doppeltes Laden aus Firebase)
    let hasData = false;

    if (window._store_decks    !== undefined) { _store.decks    = window._store_decks;    hasData = true; }
    if (window._store_settings !== undefined) { _store.settings = { ..._store.settings, ...window._store_settings }; hasData = true; }
    if (window._store_exams    !== undefined) { _store.exams    = window._store_exams;    hasData = true; }
    if (window._store_garden   !== undefined) { _store.garden   = window._store_garden;   hasData = true; }
    if (window._store_activity !== undefined) { _store.activity = window._store_activity; hasData = true; }

    // Temporäre window-Variablen aufräumen
    delete window._store_decks;
    delete window._store_settings;
    delete window._store_exams;
    delete window._store_garden;
    delete window._store_activity;

    if (hasData) {
      console.log('[Lumina Data] Store aus Firebase geladen ✦');
    } else {
      // Fallback: direkt aus Firebase laden
      const data = await window._luminaFirebase.loadAll();
      if (data) {
        if (data.decks)    _store.decks    = data.decks;
        if (data.settings) _store.settings = { ..._store.settings, ...data.settings };
        if (data.exams)    _store.exams    = data.exams;
        if (data.garden)   _store.garden   = data.garden;
        if (data.activity) _store.activity = data.activity;
        console.log('[Lumina Data] Store direkt aus Firebase geladen ✦');
      } else {
        // Erster Start ohne Firebase-Daten
        _loadFromLocalStorage();
        console.log('[Lumina Data] Erster Start — localStorage als Basis ✦');
      }
    }
  } catch(e) {
    console.warn('[Lumina Data] Load fehlgeschlagen, nutze localStorage:', e);
    _loadFromLocalStorage();
  }
}

/** Lädt Daten aus localStorage (Fallback für ersten Start) */
function _loadFromLocalStorage() {
  try {
    const decks    = localStorage.getItem('lumina_decks');
    const settings = localStorage.getItem('lumina_settings');
    const exams    = localStorage.getItem('lumina_exams');
    const garden   = localStorage.getItem('lumina_garden');
    const activity = localStorage.getItem('lumina_activity');
    if (decks)    _store.decks    = JSON.parse(decks);
    if (settings) _store.settings = { ..._store.settings, ...JSON.parse(settings) };
    if (exams)    _store.exams    = JSON.parse(exams);
    if (garden)   _store.garden   = JSON.parse(garden);
    if (activity) _store.activity = JSON.parse(activity);
  } catch(e) {}
}

/* ──────────────────────────────────────────────────────────────
   STORE SPEICHERN
────────────────────────────────────────────────────────────── */

/**
 * Speichert einen Teil des Stores sofort zu Firebase UND localStorage.
 * @param {string} key  'decks' | 'settings' | 'exams' | 'garden' | 'activity'
 */
async function _save(key) {
  const value = _store[key];
  // localStorage sofort (schnell, synchron)
  try {
    localStorage.setItem('lumina_' + key, JSON.stringify(value));
  } catch(e) {}
  // Firebase asynchron (zuverlässig, geräteübergreifend)
  try {
    await window._luminaFirebase.save(key, value);
  } catch(e) {
    console.warn('[Lumina Data] Firebase-Save fehlgeschlagen:', key, e);
  }
}

/* ──────────────────────────────────────────────────────────────
   EINSTELLUNGEN
────────────────────────────────────────────────────────────── */

function getSettings() {
  return { ...{ theme: 'dark', dailyGoal: 20 }, ..._store.settings };
}

function saveSettings(patch) {
  _store.settings = { ..._store.settings, ...patch };
  _save('settings');
}

/* ──────────────────────────────────────────────────────────────
   DECKS & KARTEN
────────────────────────────────────────────────────────────── */

function getDecks() {
  return _store.decks || [];
}

function getDeckById(deckId) {
  return getDecks().find(d => d.id === deckId) || null;
}

function createDeck({ name, description = '', color = '#9b7fe8', icon = '📚' }) {
  const deck = {
    id:          generateId(),
    name:        name.trim(),
    description: description.trim(),
    color,
    icon,
    cards:       [],
    createdAt:   Date.now(),
    lastStudied: null,
  };
  _store.decks.push(deck);
  _save('decks');
  return deck;
}

function deleteDeck(deckId) {
  _store.decks = _store.decks.filter(d => d.id !== deckId);
  _save('decks');
}

function addCardToDeck(deckId, { front, back }) {
  const deck = _store.decks.find(d => d.id === deckId);
  if (!deck) return null;
  const card = {
    id:          generateId(),
    front:       front.trim(),
    back:        back.trim(),
    difficulty:  0,
    reviewCount: 0,
    lastReview:  null,
    nextReview:  null,
  };
  deck.cards.push(card);
  _save('decks');
  return card;
}

function deleteCardFromDeck(deckId, cardId) {
  const deck = _store.decks.find(d => d.id === deckId);
  if (!deck) return;
  deck.cards = deck.cards.filter(c => c.id !== cardId);
  _save('decks');
}

function updateCardRating(deckId, cardId, rating) {
  const deck = _store.decks.find(d => d.id === deckId);
  if (!deck) return;
  const card = deck.cards.find(c => c.id === cardId);
  if (!card) return;
  const diffMap     = { easy: 1, medium: 2, hard: 3 };
  const intervalMap = { easy: 4, medium: 2, hard: 1 };
  card.difficulty   = diffMap[rating] || 2;
  card.reviewCount  = (card.reviewCount || 0) + 1;
  card.lastReview   = Date.now();
  card.nextReview   = Date.now() + intervalMap[rating] * 86400000;
  deck.lastStudied  = Date.now();
  _save('decks');
}

function getHardestCards(n = 5) {
  const all = [];
  for (const deck of getDecks()) {
    for (const card of deck.cards) {
      if (card.difficulty === 3) {
        all.push({ ...card, deckName: deck.name, deckId: deck.id });
      }
    }
  }
  return all.sort((a, b) => b.reviewCount - a.reviewCount).slice(0, n);
}

/* ──────────────────────────────────────────────────────────────
   AKTIVITÄT & STREAK
────────────────────────────────────────────────────────────── */

function getActivity() {
  return _store.activity || {};
}

function recordActivity(count = 1) {
  const today = getTodayKey();
  if (!_store.activity[today]) _store.activity[today] = 0;
  _store.activity[today] += count;
  _save('activity');
}

function getCardsLearnedToday() {
  return (_store.activity || {})[getTodayKey()] || 0;
}

function getCurrentStreak() {
  const activity = getActivity();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateToKey(d);
    if (activity[key] && activity[key] > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getBestStreak() {
  const activity = getActivity();
  const keys = Object.keys(activity).sort();
  let best = 0, current = 0, prevDate = null;
  for (const key of keys) {
    if (activity[key] > 0) {
      if (prevDate) {
        const diff = (new Date(key) - new Date(prevDate)) / 86400000;
        current = diff === 1 ? current + 1 : 1;
      } else {
        current = 1;
      }
      best = Math.max(best, current);
      prevDate = key;
    }
  }
  return best;
}

function getActivityLastDays(n = 7) {
  const activity = getActivity();
  const result = [];
  const today = new Date();
  const dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateToKey(d);
    result.push({ key, label: dayNames[d.getDay()], count: activity[key] || 0, isToday: i === 0 });
  }
  return result;
}

function getCalendarDays(n = 70) {
  const activity = getActivity();
  const result = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateToKey(d);
    result.push({ key, count: activity[key] || 0, isToday: i === 0, isFuture: i < 0 });
  }
  return result;
}

/* ──────────────────────────────────────────────────────────────
   KLAUSUREN
────────────────────────────────────────────────────────────── */

function getExams() {
  return _store.exams || [];
}

function addExam({ name, date }) {
  if (!_store.exams) _store.exams = [];
  _store.exams.push({ id: generateId(), name: name.trim(), date });
  _store.exams.sort((a, b) => new Date(a.date) - new Date(b.date));
  _save('exams');
}

function deleteExam(examId) {
  _store.exams = (_store.exams || []).filter(e => e.id !== examId);
  _save('exams');
}

function getNextExam() {
  const now = Date.now();
  const upcoming = (getExams()).filter(e => new Date(e.date).getTime() >= now);
  return upcoming.length > 0 ? upcoming[0] : null;
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

/* ──────────────────────────────────────────────────────────────
   GARTEN
────────────────────────────────────────────────────────────── */

function getGarden() {
  return _store.garden || { flowers: [], totalDaysLearned: 0 };
}

function checkAndAwardFlower() {
  const activity    = getActivity();
  const garden      = getGarden();
  const learnedDays = Object.values(activity).filter(v => v > 0).length;
  const expected    = Math.floor(learnedDays / 5);

  if (expected > (garden.flowers || []).length) {
    const idx    = garden.flowers.length % FLOWERS.length;
    const flower = { ...FLOWERS[idx], earnedAt: Date.now(), day: learnedDays };
    if (!_store.garden.flowers) _store.garden.flowers = [];
    _store.garden.flowers.push(flower);
    _store.garden.totalDaysLearned = learnedDays;
    _save('garden');
    return flower;
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────
   STATISTIK
────────────────────────────────────────────────────────────── */

function getTotalStats() {
  const decks       = getDecks();
  const activity    = getActivity();
  const totalDecks  = decks.length;
  const totalCards  = decks.reduce((s, d) => s + d.cards.length, 0);
  const totalLearned = Object.values(activity).reduce((s, v) => s + v, 0);
  const learnedDays = Object.values(activity).filter(v => v > 0).length;
  const streak      = getCurrentStreak();
  const bestStreak  = getBestStreak();
  return { totalDecks, totalCards, totalLearned, learnedDays, streak, bestStreak };
}

/* ──────────────────────────────────────────────────────────────
   IMPORT / EXPORT
────────────────────────────────────────────────────────────── */

function parseImportText(text) {
  text = text.trim();
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p.front && p.back)
                     .map(p => ({ front: String(p.front).trim(), back: String(p.back).trim() }));
      }
      if (parsed.cards) {
        return parsed.cards.filter(c => c.front && c.back)
                           .map(c => ({ front: String(c.front).trim(), back: String(c.back).trim() }));
      }
    } catch(e) {}
  }
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cards = [];
  const separators = [';', '|', '\t', ' – ', ' - '];
  for (const line of lines) {
    let found = false;
    for (const sep of separators) {
      const idx = line.indexOf(sep);
      if (idx > 0) {
        const front = line.slice(0, idx).trim();
        const back  = line.slice(idx + sep.length).trim();
        if (front && back) { cards.push({ front, back }); found = true; break; }
      }
    }
    if (!found && cards.length > 0 && !cards[cards.length - 1].back) {
      cards[cards.length - 1].back = line;
    } else if (!found) {
      cards.push({ front: line, back: '' });
    }
  }
  return cards.filter(c => c.front && c.back);
}

function exportAllDecksAsJSON() {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    decks: getDecks().map(d => ({
      name: d.name, description: d.description, color: d.color, icon: d.icon,
      cards: d.cards.map(c => ({ front: c.front, back: c.back })),
    })),
  }, null, 2);
}

/* ──────────────────────────────────────────────────────────────
   RESET
────────────────────────────────────────────────────────────── */

async function resetAllData() {
  _store = {
    decks: [], settings: { theme: 'dark', dailyGoal: 20 },
    exams: [], garden: { flowers: [], totalDaysLearned: 0 }, activity: {},
  };
  ['decks','settings','exams','garden','activity'].forEach(key => {
    localStorage.removeItem('lumina_' + key);
    _save(key);
  });
}

/* ──────────────────────────────────────────────────────────────
   HILFSFUNKTIONEN
────────────────────────────────────────────────────────────── */

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTodayKey() { return dateToKey(new Date()); }

function dateToKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

function getRandomMotivation() {
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Nächtliche Eule ✦';
  if (h < 12) return 'Guten Morgen ✦';
  if (h < 17) return 'Guten Nachmittag ✦';
  if (h < 21) return 'Guten Abend ✦';
  return 'Gute Nacht ✦';
}

function getTodayFormatted() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// Für Rückwärtskompatibilität (script.js nutzt lsGet/lsSet direkt)
function lsGet(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch(e) { return defaultValue; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}
