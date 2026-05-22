/* ═══════════════════════════════════════════════════════════════
   LUMINA — data.js
   Datenschicht: localStorage-Wrapper, State-Definitionen,
   CRUD-Operationen für Decks, Karten, Statistiken, Einstellungen.
   Kein DOM-Zugriff hier — nur reine Datenlogik.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   KONSTANTEN
────────────────────────────────────────────────────────────── */

const STORAGE_KEYS = {
  DECKS:       'lumina_decks',
  STATS:       'lumina_stats',
  SETTINGS:    'lumina_settings',
  EXAMS:       'lumina_exams',
  GARDEN:      'lumina_garden',
  ACTIVITY:    'lumina_activity',   // {YYYY-MM-DD: Anzahl Karten}
};

/** Alle verfügbaren Deck-Farben (CSS-kompatibel) */
const DECK_COLORS = [
  { name: 'Lila',        value: '#9b7fe8' },
  { name: 'Blau',        value: '#6da3d8' },
  { name: 'Teal',        value: '#5ec4b6' },
  { name: 'Rose',        value: '#d87fb0' },
  { name: 'Lavendel',    value: '#b8a0f0' },
  { name: 'Silber',      value: '#a0a8c4' },
  { name: 'Indigo',      value: '#7264c8' },
  { name: 'Aqua',        value: '#60b4d4' },
];

/** Deck-Emojis zur Auswahl */
const DECK_ICONS = ['📚', '🌸', '🔬', '⚗️', '🧬', '📐', '🌍', '🎼', '💡', '🌿', '🧠', '✨'];

/** Motivationssprüche */
const MOTIVATIONS = [
  'Jede Karte bringt dich deinem Ziel näher.',
  'Wissen ist das einzige Gut, das wächst, wenn man es teilt.',
  'Der Weg zum Erfolg ist gepflastert mit beständigem Lernen.',
  'Kleine Schritte führen zu großen Zielen.',
  'Du bist heute besser als gestern — und morgen besser als heute.',
  'Lernen ist nicht Vorbereitung auf das Leben — Lernen ist das Leben.',
  'Konsistenz schlägt Perfektion jeden Tag.',
  'Dein zukünftiges Ich wird dir für heute danken.',
  'Das Geheimnis liegt in der Regelmäßigkeit.',
  'Eine Stunde täglich — ein Semester Vorsprung.',
];

/** Blumen für den Garten */
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
   localStorage HILFSFUNKTIONEN
────────────────────────────────────────────────────────────── */

/**
 * Liest einen Wert aus localStorage und parst JSON.
 * Gibt `defaultValue` zurück, wenn der Key nicht existiert.
 */
function lsGet(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('[Lumina] localStorage read error:', key, e);
    return defaultValue;
  }
}

/**
 * Schreibt einen Wert als JSON in localStorage.
 */
function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Lumina] localStorage write error:', key, e);
  }
}

/* ──────────────────────────────────────────────────────────────
   EINSTELLUNGEN
────────────────────────────────────────────────────────────── */

const DEFAULT_SETTINGS = {
  theme:      'dark',
  dailyGoal:  20,
};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...lsGet(STORAGE_KEYS.SETTINGS, {}) };
}

function saveSettings(patch) {
  const current = getSettings();
  lsSet(STORAGE_KEYS.SETTINGS, { ...current, ...patch });
}

/* ──────────────────────────────────────────────────────────────
   DECKS & KARTEN
────────────────────────────────────────────────────────────── */

/** Gibt alle Decks zurück (Array). */
function getDecks() {
  return lsGet(STORAGE_KEYS.DECKS, []);
}

/** Speichert alle Decks (komplettes Array überschreiben). */
function saveDecks(decks) {
  lsSet(STORAGE_KEYS.DECKS, decks);
}

/**
 * Erstellt ein neues Deck und speichert es.
 * @returns {Object} Das neu erstellte Deck
 */
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
  const decks = getDecks();
  decks.push(deck);
  saveDecks(decks);
  return deck;
}

/**
 * Löscht ein Deck anhand seiner ID.
 */
function deleteDeck(deckId) {
  const decks = getDecks().filter(d => d.id !== deckId);
  saveDecks(decks);
}

/**
 * Gibt ein einzelnes Deck zurück.
 */
function getDeckById(deckId) {
  return getDecks().find(d => d.id === deckId) || null;
}

/**
 * Fügt eine Karte zu einem Deck hinzu.
 * @returns {Object|null} Die neue Karte oder null bei Fehler
 */
function addCardToDeck(deckId, { front, back }) {
  const decks = getDecks();
  const deck  = decks.find(d => d.id === deckId);
  if (!deck) return null;

  const card = {
    id:         generateId(),
    front:      front.trim(),
    back:       back.trim(),
    difficulty: 0,         // 0 = unbewertet, 1 = leicht, 2 = mittel, 3 = schwer
    reviewCount: 0,
    lastReview: null,
    nextReview: null,      // für späteres Spaced-Repetition-System
  };
  deck.cards.push(card);
  saveDecks(decks);
  return card;
}

/**
 * Löscht eine Karte aus einem Deck.
 */
function deleteCardFromDeck(deckId, cardId) {
  const decks = getDecks();
  const deck  = decks.find(d => d.id === deckId);
  if (!deck) return;
  deck.cards = deck.cards.filter(c => c.id !== cardId);
  saveDecks(decks);
}

/**
 * Aktualisiert die Bewertung einer Karte nach einer Lernsession.
 * Berechnet auch nextReview nach einem einfachen SM-2-ähnlichen Ansatz.
 */
function updateCardRating(deckId, cardId, rating) {
  // rating: 'easy' | 'medium' | 'hard'
  const decks = getDecks();
  const deck  = decks.find(d => d.id === deckId);
  if (!deck) return;

  const card = deck.cards.find(c => c.id === cardId);
  if (!card) return;

  const diffMap = { easy: 1, medium: 2, hard: 3 };
  card.difficulty  = diffMap[rating] || 2;
  card.reviewCount = (card.reviewCount || 0) + 1;
  card.lastReview  = Date.now();

  // Einfaches Intervall-System: schwere Karten werden schneller wiederholt
  const intervalDays = { easy: 4, medium: 2, hard: 1 };
  card.nextReview = Date.now() + intervalDays[rating] * 86400000;

  deck.lastStudied = Date.now();
  saveDecks(decks);
}

/**
 * Gibt die N schwierigsten Karten über alle Decks zurück.
 */
function getHardestCards(n = 5) {
  const decks = getDecks();
  const allCards = [];
  for (const deck of decks) {
    for (const card of deck.cards) {
      if (card.difficulty === 3) {
        allCards.push({ ...card, deckName: deck.name, deckId: deck.id });
      }
    }
  }
  // Sortierung: meiste Reviews mit schwer zuerst
  return allCards
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, n);
}

/* ──────────────────────────────────────────────────────────────
   AKTIVITÄTS-TRACKING (Streak, Tagesstatistik)
────────────────────────────────────────────────────────────── */

/** Gibt alle Aktivitätstage zurück: { 'YYYY-MM-DD': count } */
function getActivity() {
  return lsGet(STORAGE_KEYS.ACTIVITY, {});
}

/** Speichert Aktivität. */
function saveActivity(activity) {
  lsSet(STORAGE_KEYS.ACTIVITY, activity);
}

/**
 * Erhöht den Karten-Zähler für heute um `count`.
 */
function recordActivity(count = 1) {
  const activity = getActivity();
  const today    = getTodayKey();
  activity[today] = (activity[today] || 0) + count;
  saveActivity(activity);
}

/**
 * Gibt die Anzahl heute gelernter Karten zurück.
 */
function getCardsLearnedToday() {
  const activity = getActivity();
  return activity[getTodayKey()] || 0;
}

/**
 * Berechnet den aktuellen Streak (aufeinanderfolgende Lerntage bis heute).
 */
function getCurrentStreak() {
  const activity = getActivity();
  let streak     = 0;
  const today    = new Date();

  for (let i = 0; i < 365; i++) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateToKey(d);
    if (activity[key] && activity[key] > 0) {
      streak++;
    } else {
      break; // Lücke → Streak endet
    }
  }
  return streak;
}

/**
 * Berechnet den besten Streak aller Zeiten.
 */
function getBestStreak() {
  const activity = getActivity();
  const keys     = Object.keys(activity).sort();
  let best = 0, current = 0;
  let prevDate = null;

  for (const key of keys) {
    if (activity[key] > 0) {
      if (prevDate) {
        const prev = new Date(prevDate);
        const curr = new Date(key);
        const diff = (curr - prev) / 86400000;
        current = diff === 1 ? current + 1 : 1;
      } else {
        current = 1;
      }
      best    = Math.max(best, current);
      prevDate = key;
    }
  }
  return best;
}

/**
 * Gibt Aktivität für die letzten N Tage zurück.
 * @returns {Array<{label, count, isToday}>}
 */
function getActivityLastDays(n = 7) {
  const activity = getActivity();
  const result   = [];
  const today    = new Date();
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  for (let i = n - 1; i >= 0; i--) {
    const d      = new Date(today);
    d.setDate(d.getDate() - i);
    const key    = dateToKey(d);
    result.push({
      key,
      label:   dayNames[d.getDay()],
      count:   activity[key] || 0,
      isToday: i === 0,
    });
  }
  return result;
}

/**
 * Gibt Aktivität für die letzten N Tage als Kalender-Daten zurück.
 */
function getCalendarDays(n = 70) {
  const activity = getActivity();
  const result   = [];
  const today    = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const d      = new Date(today);
    d.setDate(d.getDate() - i);
    const key    = dateToKey(d);
    result.push({
      key,
      count:    activity[key] || 0,
      isToday:  i === 0,
      isFuture: i < 0,
    });
  }
  return result;
}

/* ──────────────────────────────────────────────────────────────
   KLAUSUREN
────────────────────────────────────────────────────────────── */

function getExams() {
  return lsGet(STORAGE_KEYS.EXAMS, []);
}

function saveExams(exams) {
  lsSet(STORAGE_KEYS.EXAMS, exams);
}

function addExam({ name, date }) {
  const exams = getExams();
  exams.push({ id: generateId(), name: name.trim(), date });
  // Sortierung: nächste Klausur zuerst
  exams.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveExams(exams);
}

function deleteExam(examId) {
  saveExams(getExams().filter(e => e.id !== examId));
}

/**
 * Gibt die nächste bevorstehende Klausur zurück (oder null).
 */
function getNextExam() {
  const now   = Date.now();
  const exams = getExams().filter(e => new Date(e.date).getTime() >= now);
  return exams.length > 0 ? exams[0] : null;
}

/**
 * Berechnet Tage bis zu einem Datum.
 */
function daysUntil(dateStr) {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

/* ──────────────────────────────────────────────────────────────
   GARTEN-SYSTEM
────────────────────────────────────────────────────────────── */

function getGarden() {
  return lsGet(STORAGE_KEYS.GARDEN, { flowers: [], totalDaysLearned: 0 });
}

function saveGarden(garden) {
  lsSet(STORAGE_KEYS.GARDEN, garden);
}

/**
 * Prüft nach jedem Lerntag, ob eine neue Blume verdient wurde.
 * Eine Blume pro 5 Lerntage.
 * @returns {Object|null} Neue Blume oder null
 */
function checkAndAwardFlower() {
  const activity = getActivity();
  const garden   = getGarden();

  // Anzahl Tage, an denen überhaupt gelernt wurde
  const learnedDays = Object.values(activity).filter(v => v > 0).length;

  // Wie viele Blumen sollte der Nutzer haben?
  const expectedFlowers = Math.floor(learnedDays / 5);

  if (expectedFlowers > garden.flowers.length) {
    // Neue Blume vergeben
    const idx    = garden.flowers.length % FLOWERS.length;
    const flower = { ...FLOWERS[idx], earnedAt: Date.now(), day: learnedDays };
    garden.flowers.push(flower);
    garden.totalDaysLearned = learnedDays;
    saveGarden(garden);
    return flower;
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────
   IMPORT / EXPORT HILFSFUNKTIONEN
────────────────────────────────────────────────────────────── */

/**
 * Parst eine Textdatei in Karteikarten-Paare.
 * Unterstützt:
 *   - "Frage ; Antwort" (pro Zeile)
 *   - "Frage | Antwort" (pro Zeile)
 *   - "Frage\tAntwort"  (Tab-getrennt, z.B. aus Anki)
 *   - JSON (Lumina-Format)
 */
function parseImportText(text) {
  text = text.trim();

  // JSON-Format
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      // Lumina-Format: Array von {front, back}
      if (Array.isArray(parsed)) {
        return parsed
          .filter(p => p.front && p.back)
          .map(p => ({ front: String(p.front).trim(), back: String(p.back).trim() }));
      }
      // Deck-Export-Format: {name, cards:[]}
      if (parsed.cards) {
        return parsed.cards
          .filter(c => c.front && c.back)
          .map(c => ({ front: String(c.front).trim(), back: String(c.back).trim() }));
      }
    } catch (e) {
      // kein gültiges JSON → weiter mit Textparser
    }
  }

  // Zeilen-basiertes Parsing
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cards  = [];
  const separators = [';', '|', '\t', ' – ', ' - '];

  for (const line of lines) {
    let found = false;
    for (const sep of separators) {
      const idx = line.indexOf(sep);
      if (idx > 0) {
        const front = line.slice(0, idx).trim();
        const back  = line.slice(idx + sep.length).trim();
        if (front && back) {
          cards.push({ front, back });
          found = true;
          break;
        }
      }
    }
    // Falls keine Trenner: Zeile als Frage, nächste Zeile als Antwort (Paarweise)
    if (!found && cards.length > 0 && !cards[cards.length - 1].back) {
      cards[cards.length - 1].back = line;
    } else if (!found) {
      cards.push({ front: line, back: '' });
    }
  }

  // Karten ohne Antwort herausfiltern
  return cards.filter(c => c.front && c.back);
}

/**
 * Exportiert alle Decks als JSON-String (Lumina-Format).
 */
function exportAllDecksAsJSON() {
  const decks = getDecks();
  const data  = {
    version:   '1.0',
    exportedAt: new Date().toISOString(),
    decks:     decks.map(d => ({
      name:        d.name,
      description: d.description,
      color:       d.color,
      icon:        d.icon,
      cards:       d.cards.map(c => ({ front: c.front, back: c.back })),
    })),
  };
  return JSON.stringify(data, null, 2);
}

/* ──────────────────────────────────────────────────────────────
   STATISTIK
────────────────────────────────────────────────────────────── */

function getTotalStats() {
  const decks    = getDecks();
  const activity = getActivity();

  const totalDecks = decks.length;
  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
  const totalLearned = Object.values(activity).reduce((s, v) => s + v, 0);
  const learnedDays  = Object.values(activity).filter(v => v > 0).length;
  const streak       = getCurrentStreak();
  const bestStreak   = getBestStreak();

  return { totalDecks, totalCards, totalLearned, learnedDays, streak, bestStreak };
}

/* ──────────────────────────────────────────────────────────────
   HILFSFUNKTIONEN
────────────────────────────────────────────────────────────── */

/** Generiert eine kurze, eindeutige ID. */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Gibt das heutige Datum als 'YYYY-MM-DD' zurück. */
function getTodayKey() {
  return dateToKey(new Date());
}

/** Konvertiert ein Date-Objekt in 'YYYY-MM-DD'. */
function dateToKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formatiert ein Datum für die Anzeige. */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

/** Liefert eine zufällige Motivation. */
function getRandomMotivation() {
  return MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
}

/** Liefert die Tageszeit-Begrüßung. */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Nächtliche Eule ✦';
  if (h < 12) return 'Guten Morgen ✦';
  if (h < 17) return 'Guten Nachmittag ✦';
  if (h < 21) return 'Guten Abend ✦';
  return 'Gute Nacht ✦';
}

/** Gibt das heutige Datum als lesbaren String zurück. */
function getTodayFormatted() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/* ──────────────────────────────────────────────────────────────
   RESET
────────────────────────────────────────────────────────────── */

function resetAllData() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}
