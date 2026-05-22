/* ═══════════════════════════════════════════════════════════════
   LUMINA — learn.js
   Vollständiger Lernmodus:
   - Session starten / beenden
   - Karten-Reihenfolge (schwere Karten häufiger)
   - 3D Flip-Animation
   - Bewertung: Leicht / Mittel / Schwer
   - Fortschrittsbalken
   - Activity Tracking nach jeder Karte
   - Blumen-Belohnung prüfen & anzeigen
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   SESSION-STATE
   Alle Variablen, die den Zustand einer laufenden Lernsession
   beschreiben. Werden bei jedem Start zurückgesetzt.
────────────────────────────────────────────────────────────── */

const LearnSession = {
  deckId:      null,   // ID des aktuellen Decks
  queue:       [],     // Karten-Warteschlange (Array von card-Objekten)
  currentIdx:  0,      // Index der aktuellen Karte in queue
  isFlipped:   false,  // Zeigt die Karte gerade die Rückseite?
  totalCards:  0,      // Gesamtzahl der Karten in dieser Session
  ratedCount:  0,      // Anzahl bereits bewerteter Karten
};

/* ──────────────────────────────────────────────────────────────
   SESSION STARTEN
────────────────────────────────────────────────────────────── */

/**
 * Startet eine neue Lernsession für ein Deck.
 * Baut die Karten-Warteschlange auf und zeigt den Overlay.
 *
 * @param {string} deckId  ID des zu lernenden Decks
 */
function startLearnSession(deckId) {
  const deck = getDeckById(deckId);
  if (!deck || deck.cards.length === 0) {
    showToast('Dieser Stapel hat noch keine Karten.');
    return;
  }

  // Session initialisieren
  LearnSession.deckId     = deckId;
  LearnSession.currentIdx = 0;
  LearnSession.isFlipped  = false;
  LearnSession.ratedCount = 0;

  // Karten-Warteschlange aufbauen:
  // Schwere Karten (difficulty=3) werden doppelt eingereiht,
  // mittlere (difficulty=2) eineinhalb mal (gerundet), leichte einmal.
  LearnSession.queue = buildLearningQueue(deck.cards);
  LearnSession.totalCards = LearnSession.queue.length;

  // Modal schließen falls offen
  closeAllModals();

  // Lernoverlay anzeigen
  const overlay = document.getElementById('learn-overlay');
  if (overlay) overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Erste Karte anzeigen
  showCurrentCard();
}

/**
 * Baut eine priorisierte Lernwarteschlange.
 * Schwere Karten erscheinen öfter, leichte seltener.
 *
 * @param {Array} cards  Karten-Array des Decks
 * @returns {Array}      Gemischte, priorisierte Warteschlange
 */
function buildLearningQueue(cards) {
  const queue = [];

  for (const card of cards) {
    queue.push({ ...card }); // immer mindestens einmal

    // Schwere Karten: ein zweites Mal einreihen
    if (card.difficulty === 3) {
      queue.push({ ...card, _repeat: true });
    }
    // Mittlere Karten ohne vorherigen Review: auch wiederholen
    else if (card.difficulty === 2 && card.reviewCount < 3) {
      queue.push({ ...card, _repeat: true });
    }
  }

  // Mischen (Fisher-Yates-Algorithmus)
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

/* ──────────────────────────────────────────────────────────────
   KARTE ANZEIGEN
────────────────────────────────────────────────────────────── */

/**
 * Zeigt die aktuelle Karte (LearnSession.currentIdx) im Overlay an.
 * Setzt die Karte auf Vorderseite zurück und versteckt die Bewertungs-Buttons.
 */
function showCurrentCard() {
  const card = LearnSession.queue[LearnSession.currentIdx];
  if (!card) return;

  // Texte setzen
  const frontEl = document.getElementById('card-front-text');
  const backEl  = document.getElementById('card-back-text');
  if (frontEl) frontEl.textContent = card.front;
  if (backEl)  backEl.textContent  = card.back;

  // Karte auf Vorderseite zurücksetzen (ohne Animation, sofort)
  const cardEl = document.getElementById('flashcard-3d');
  if (cardEl) {
    cardEl.style.transition = 'none';
    cardEl.classList.remove('flipped');
    // Transition nach einem Frame wieder aktivieren
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cardEl.style.transition = '';
      });
    });
  }

  // Flip-Zustand zurücksetzen
  LearnSession.isFlipped = false;

  // Bewertungs-Buttons verstecken, Flip-Hint zeigen
  const ratingEl = document.getElementById('learn-rating');
  const hintEl   = document.querySelector('.flip-hint');
  if (ratingEl) ratingEl.classList.add('hidden');
  if (hintEl)   hintEl.style.opacity = '1';

  // Fortschrittsbalken und Zähler aktualisieren
  updateLearnProgress();
}

/**
 * Dreht die Karte um (Vorderseite ↔ Rückseite).
 * Nach dem Umdrehen werden die Bewertungs-Buttons eingeblendet.
 */
function flipCard() {
  const cardEl   = document.getElementById('flashcard-3d');
  const ratingEl = document.getElementById('learn-rating');
  const hintEl   = document.querySelector('.flip-hint');

  if (!cardEl) return;

  LearnSession.isFlipped = !LearnSession.isFlipped;
  cardEl.classList.toggle('flipped', LearnSession.isFlipped);

  // Nach dem Flip: Bewertung einblenden
  if (LearnSession.isFlipped) {
    if (ratingEl) ratingEl.classList.remove('hidden');
    if (hintEl)   hintEl.style.opacity = '0';
  } else {
    if (ratingEl) ratingEl.classList.add('hidden');
    if (hintEl)   hintEl.style.opacity = '1';
  }
}

/* ──────────────────────────────────────────────────────────────
   BEWERTUNG & NÄCHSTE KARTE
────────────────────────────────────────────────────────────── */

/**
 * Verarbeitet eine Bewertung (easy / medium / hard).
 * Speichert die Bewertung, trackt Aktivität, prüft Blumen-Belohnung
 * und geht zur nächsten Karte oder beendet die Session.
 *
 * @param {string} rating  'easy' | 'medium' | 'hard'
 */
function rateCard(rating) {
  const card = LearnSession.queue[LearnSession.currentIdx];
  if (!card) return;

  // Bewertung in data.js speichern (nur für echte Karten, nicht _repeat)
  updateCardRating(LearnSession.deckId, card.id, rating);

  // Aktivität aufzeichnen (eine Karte gelernt)
  recordActivity(1);

  LearnSession.ratedCount++;

  // Nächste Karte oder Session beenden
  const nextIdx = LearnSession.currentIdx + 1;

  if (nextIdx < LearnSession.queue.length) {
    LearnSession.currentIdx = nextIdx;
    showCurrentCard();
  } else {
    endLearnSession();
  }
}

/* ──────────────────────────────────────────────────────────────
   FORTSCHRITTSBALKEN
────────────────────────────────────────────────────────────── */

/**
 * Aktualisiert den Fortschrittsbalken und den Zähler im Overlay.
 */
function updateLearnProgress() {
  const current = LearnSession.currentIdx + 1;
  const total   = LearnSession.totalCards;

  // Zähler-Text
  const counterEl = document.getElementById('learn-counter');
  if (counterEl) counterEl.textContent = `${current} / ${total}`;

  // Balken-Breite
  const barEl = document.getElementById('learn-progress-bar');
  if (barEl) {
    const pct = ((current - 1) / total) * 100;
    barEl.style.width = `${pct}%`;
  }
}

/* ──────────────────────────────────────────────────────────────
   SESSION BEENDEN
────────────────────────────────────────────────────────────── */

/**
 * Beendet die Lernsession.
 * Zeigt eine Abschluss-Zusammenfassung, prüft Blumen-Belohnung,
 * aktualisiert die Home-Ansicht und schließt den Overlay.
 */
function endLearnSession() {
  const ratedCount = LearnSession.ratedCount;
  const deckName   = getDeckById(LearnSession.deckId)?.name || 'Stapel';

  // Blumen-Belohnung prüfen
  const newFlower = checkAndAwardFlower();

  // Overlay nach kurzer Verzögerung schließen (für bessere UX)
  setTimeout(() => {
    closeLearnOverlay();

    // Zurück zur Bibliothek, falls noch dort
    if (currentView === 'library') {
      renderLibrary();
    }

    // Home immer aktualisieren (Ring, Stats)
    renderHome();

    // Toast-Nachricht
    let msg = `✦ ${ratedCount} Karten gelernt aus "${deckName}"`;
    if (newFlower) {
      msg += ` · 🌸 Neue Blume: ${newFlower.name}!`;
      // Garten-Animation auslösen
      triggerFlowerUnlock(newFlower);
    }
    showToast(msg, 4000);

  }, 350);
}

/**
 * Schließt den Lern-Overlay und stellt den normalen Scroll-Zustand wieder her.
 */
function closeLearnOverlay() {
  const overlay = document.getElementById('learn-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';

  // Session zurücksetzen
  LearnSession.deckId     = null;
  LearnSession.queue      = [];
  LearnSession.currentIdx = 0;
  LearnSession.isFlipped  = false;
  LearnSession.ratedCount = 0;
  LearnSession.totalCards = 0;
}

/* ──────────────────────────────────────────────────────────────
   EVENT-LISTENER FÜR DEN LERNMODUS
   Werden von script.js beim Init einmal registriert.
────────────────────────────────────────────────────────────── */

/**
 * Registriert alle Event-Listener für den Lernmodus.
 * Wird genau einmal von script.js aufgerufen.
 */
function initLearnListeners() {

  // Karte umdrehen per Klick
  const cardEl = document.getElementById('flashcard-3d');
  if (cardEl) {
    cardEl.addEventListener('click', () => {
      // Nur umdrehen, wenn eine Session aktiv ist
      if (LearnSession.queue.length > 0) flipCard();
    });
  }

  // Tastatur: Leertaste dreht Karte um, Pfeiltasten für Bewertung
  document.addEventListener('keydown', handleLearnKeyboard);

  // Bewertungs-Buttons
  document.querySelectorAll('.btn-rate').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = btn.dataset.rating; // 'easy' | 'medium' | 'hard'
      if (rating && LearnSession.isFlipped) {
        rateCard(rating);
      }
    });
  });

  // "Lernen beenden"-Button
  const closeBtn = document.getElementById('close-learn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (LearnSession.ratedCount > 0) {
        // Wenn bereits Karten bewertet wurden, Session offiziell beenden
        endLearnSession();
      } else {
        closeLearnOverlay();
      }
    });
  }

  // "Lernen starten"-Button im Deck-Detail-Modal
  const startBtn = document.getElementById('start-learn-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (activeDeckId) startLearnSession(activeDeckId);
    });
  }
}

/**
 * Tastatur-Steuerung im Lernmodus.
 * - Leertaste / Enter: Karte umdrehen
 * - 1 / Pfeil links:  Leicht
 * - 2 / Pfeil unten:  Mittel
 * - 3 / Pfeil rechts: Schwer
 * - Escape:           Session beenden
 */
function handleLearnKeyboard(e) {
  const overlay = document.getElementById('learn-overlay');
  if (!overlay || overlay.classList.contains('hidden')) return;

  switch (e.key) {
    case ' ':
    case 'Enter':
      e.preventDefault();
      if (!LearnSession.isFlipped) flipCard();
      break;
    case '1':
    case 'ArrowLeft':
      if (LearnSession.isFlipped) { e.preventDefault(); rateCard('easy'); }
      break;
    case '2':
    case 'ArrowDown':
      if (LearnSession.isFlipped) { e.preventDefault(); rateCard('medium'); }
      break;
    case '3':
    case 'ArrowRight':
      if (LearnSession.isFlipped) { e.preventDefault(); rateCard('hard'); }
      break;
    case 'Escape':
      e.preventDefault();
      if (LearnSession.ratedCount > 0) {
        endLearnSession();
      } else {
        closeLearnOverlay();
      }
      break;
  }
}
