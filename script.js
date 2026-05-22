/* ═══════════════════════════════════════════════════════════════
   LUMINA — script.js
   Haupt-Initialisierung der App.

   Verantwortlich für:
   - DOMContentLoaded: App-Start
   - Alle globalen Event-Listener (Navigation, Buttons, Modals)
   - Theme-Initialisierung
   - Initialer Render aller Views
   - Koordination zwischen ui.js, learn.js, garden.js, import-export.js

   Reihenfolge der geladenen Skripte (index.html):
     1. data.js        — Daten & localStorage
     2. ui.js          — DOM-Rendering
     3. learn.js       — Lernmodus
     4. garden.js      — Garten-Animationen
     5. import-export.js — Im-/Export
     6. script.js      — Dieses Skript (Bootstrap)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   APP-START: Warten bis das DOM vollständig geladen ist
────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

/**
 * Haupt-Initialisierungsfunktion.
 * Wird einmal nach dem DOM-Load aufgerufen.
 */
function initApp() {

  // ── 1. Theme laden und anwenden ───────────────────────────
  const savedTheme = getSettings().theme || 'dark';
  applyTheme(savedTheme);

  // ── 2. Event-Listener registrieren ───────────────────────
  initNavigationListeners();
  initHomeListeners();
  initLibraryListeners();
  initModalListeners();
  initSettingsListeners();
  initLearnListeners();        // aus learn.js
  initImportExportListeners(); // aus import-export.js

  // ── 3. Initialen View rendern (Startseite) ────────────────
  switchView('home');

  // ── 4. Tägliche Daten prüfen ─────────────────────────────
  checkDailyReset();

  console.log('[Lumina] App initialisiert ✦');
}

/* ──────────────────────────────────────────────────────────────
   1. NAVIGATION
────────────────────────────────────────────────────────────── */

function initNavigationListeners() {

  // Sidebar-Nav-Links: View wechseln
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      if (view) switchView(view);
    });
  });

  // Mobile: Hamburger-Button → Sidebar öffnen/schließen
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', toggleMobileSidebar);
  }

  // Mobile: Klick auf Hauptinhalt → Sidebar schließen
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.addEventListener('click', () => {
      // Nur auf kleinen Screens schließen
      if (window.innerWidth <= 768) closeMobileSidebar();
    });
  }

  // Tastatur: Escape schließt offene Sidebar auf Mobile
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
      closeMobileSidebar();
    }
  });
}

/* ──────────────────────────────────────────────────────────────
   2. STARTSEITE
────────────────────────────────────────────────────────────── */

function initHomeListeners() {

  // Theme-Toggle-Button (◑/◐ oben rechts auf der Startseite)
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Tagesziel speichern
  const goalSaveBtn = document.getElementById('goal-save');
  if (goalSaveBtn) {
    goalSaveBtn.addEventListener('click', saveGoalFromHome);
  }

  // Goal-Input: Enter-Taste
  const goalInput = document.getElementById('goal-input');
  if (goalInput) {
    goalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveGoalFromHome();
    });
  }

  // Klausur eintragen
  const examSaveBtn = document.getElementById('exam-save');
  if (examSaveBtn) {
    examSaveBtn.addEventListener('click', saveExamFromHome);
  }

  // Klausur-Input: Enter-Taste
  const examDateInput = document.getElementById('exam-date-input');
  if (examDateInput) {
    examDateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveExamFromHome();
    });
  }
}

/** Liest das Tagesziel aus dem Home-Input und speichert es. */
function saveGoalFromHome() {
  const input = document.getElementById('goal-input');
  const val   = parseInt(input?.value, 10);
  if (!val || val < 1 || val > 999) {
    showToast('Bitte eine Zahl zwischen 1 und 999 eingeben.');
    return;
  }
  saveSettings({ dailyGoal: val });
  renderGoalRing();
  showToast(`Tagesziel: ${val} Karten`);
}

/** Liest Klausur-Name und -Datum und speichert sie. */
function saveExamFromHome() {
  const nameInput = document.getElementById('exam-name-input');
  const dateInput = document.getElementById('exam-date-input');

  const name = nameInput?.value.trim();
  const date = dateInput?.value;

  if (!name) { showToast('Bitte einen Klausurnamen eingeben.'); return; }
  if (!date) { showToast('Bitte ein Datum auswählen.'); return; }

  // Datum darf nicht in der Vergangenheit liegen
  if (daysUntil(date) < 0) {
    showToast('Das Datum liegt in der Vergangenheit.');
    return;
  }

  addExam({ name, date });

  if (nameInput) nameInput.value = '';
  if (dateInput) dateInput.value = '';

  renderExamSection();
  showToast(`Klausur "${name}" eingetragen`);
}

/* ──────────────────────────────────────────────────────────────
   3. BIBLIOTHEK
────────────────────────────────────────────────────────────── */

function initLibraryListeners() {

  // "Neuer Stapel"-Button (Header)
  const createBtn = document.getElementById('create-deck-btn');
  if (createBtn) {
    createBtn.addEventListener('click', openCreateDeckModal);
  }

  // "Neuer Stapel"-Button (Empty-State)
  const createBtn2 = document.getElementById('create-deck-btn-2');
  if (createBtn2) {
    createBtn2.addEventListener('click', openCreateDeckModal);
  }

  // Suche: Echtzeit-Filter
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderLibrary(e.target.value);
    });
  }

  // Sortierung: Neu rendern bei Änderung
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const q = document.getElementById('search-input')?.value || '';
      renderLibrary(q);
    });
  }
}

/** Öffnet das "Neuer Stapel"-Modal und initialisiert den Color-Picker. */
function openCreateDeckModal() {
  // Felder leeren
  const nameInput = document.getElementById('deck-name-input');
  const descInput = document.getElementById('deck-desc-input');
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';

  // Color-Picker befüllen
  renderColorPicker();

  openModal('modal-create-deck');
}

/* ──────────────────────────────────────────────────────────────
   4. MODALS
────────────────────────────────────────────────────────────── */

function initModalListeners() {

  // ── Deck erstellen ──────────────────────────────────────

  // Abbrechen
  const cancelCreate = document.getElementById('cancel-create-deck');
  if (cancelCreate) {
    cancelCreate.addEventListener('click', () => closeModal('modal-create-deck'));
  }

  // Erstellen bestätigen
  const confirmCreate = document.getElementById('confirm-create-deck');
  if (confirmCreate) {
    confirmCreate.addEventListener('click', handleCreateDeck);
  }

  // Enter im Deck-Name-Input
  const deckNameInput = document.getElementById('deck-name-input');
  if (deckNameInput) {
    deckNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreateDeck();
    });
  }

  // Klick auf Modal-Overlay schließt das Modal
  const createModal = document.getElementById('modal-create-deck');
  if (createModal) {
    createModal.addEventListener('click', (e) => {
      if (e.target === createModal) closeModal('modal-create-deck');
    });
  }

  // ── Deck-Detail ─────────────────────────────────────────

  // Schließen
  const closeDeckDetail = document.getElementById('close-deck-detail');
  if (closeDeckDetail) {
    closeDeckDetail.addEventListener('click', () => {
      closeModal('modal-deck-detail');
      activeDeckId = null;
    });
  }

  // Klick auf Overlay
  const detailModal = document.getElementById('modal-deck-detail');
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) {
        closeModal('modal-deck-detail');
        activeDeckId = null;
      }
    });
  }

  // Karte hinzufügen
  const addCardBtn = document.getElementById('add-card-btn');
  if (addCardBtn) {
    addCardBtn.addEventListener('click', handleAddCard);
  }

  // Enter in den Karten-Textareas (Strg+Enter fügt Karte hinzu)
  const frontInput = document.getElementById('new-card-front');
  const backInput  = document.getElementById('new-card-back');

  if (frontInput) {
    frontInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAddCard();
    });
  }
  if (backInput) {
    backInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAddCard();
    });
  }
}

/**
 * Verarbeitet das Erstellen eines neuen Decks.
 */
function handleCreateDeck() {
  const nameInput = document.getElementById('deck-name-input');
  const descInput = document.getElementById('deck-desc-input');

  const name = nameInput?.value.trim();
  if (!name) {
    showToast('Bitte einen Namen eingeben.');
    nameInput?.focus();
    return;
  }

  // Icon: zufällig aus DECK_ICONS wählen (erweiterbar: User-Auswahl)
  const icon = DECK_ICONS[Math.floor(Math.random() * DECK_ICONS.length)];

  createDeck({
    name,
    description: descInput?.value.trim() || '',
    color:       selectedDeckColor,
    icon,
  });

  closeModal('modal-create-deck');
  renderLibrary();
  renderHome(); // Stats aktualisieren

  showToast(`Stapel "${name}" erstellt`);
}

/**
 * Fügt eine neue Karte zum aktuell geöffneten Deck hinzu.
 */
function handleAddCard() {
  if (!activeDeckId) return;

  const frontEl = document.getElementById('new-card-front');
  const backEl  = document.getElementById('new-card-back');

  const front = frontEl?.value.trim();
  const back  = backEl?.value.trim();

  if (!front) { showToast('Bitte die Vorderseite ausfüllen.'); frontEl?.focus(); return; }
  if (!back)  { showToast('Bitte die Rückseite ausfüllen.'); backEl?.focus();  return; }

  const card = addCardToDeck(activeDeckId, { front, back });
  if (!card) { showToast('Fehler beim Hinzufügen der Karte.'); return; }

  // Felder leeren, Fokus zurück auf Vorderseite
  if (frontEl) { frontEl.value = ''; frontEl.focus(); }
  if (backEl)  backEl.value = '';

  // Karten-Liste im Modal neu rendern
  renderCardsList(activeDeckId);

  // Modal-Sub-Titel aktualisieren
  const updatedDeck = getDeckById(activeDeckId);
  const subEl = document.getElementById('deck-detail-sub');
  if (subEl && updatedDeck) {
    subEl.textContent = `${updatedDeck.cards.length} Karten · ${updatedDeck.description || ''}`;
  }

  showToast('Karte hinzugefügt');
}

/* ──────────────────────────────────────────────────────────────
   5. EINSTELLUNGEN
────────────────────────────────────────────────────────────── */

function initSettingsListeners() {

  // Theme-Buttons (Dunkel / Hell)
  document.querySelectorAll('[data-theme-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeBtn;
      applyTheme(theme);
    });
  });

  // Tagesziel in Einstellungen speichern
  const settingsGoalSave = document.getElementById('settings-goal-save');
  if (settingsGoalSave) {
    settingsGoalSave.addEventListener('click', () => {
      const input = document.getElementById('settings-goal');
      const val   = parseInt(input?.value, 10);
      if (!val || val < 1 || val > 999) {
        showToast('Bitte eine Zahl zwischen 1 und 999 eingeben.');
        return;
      }
      saveSettings({ dailyGoal: val });
      renderGoalRing();
      showToast(`Tagesziel: ${val} Karten`);
    });
  }

  // Alle Daten zurücksetzen
  const resetBtn = document.getElementById('reset-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmed = confirm(
        'Alle Daten wirklich löschen?\n\nDieser Schritt kann nicht rückgängig gemacht werden.'
      );
      if (confirmed) {
        resetAllData();
        // App neu starten (einfachster Weg: Seite neu laden)
        window.location.reload();
      }
    });
  }
}

/* ──────────────────────────────────────────────────────────────
   TÄGLICHER RESET-CHECK
   Stellt sicher, dass Streak etc. korrekt berechnet werden,
   wenn der Nutzer die App nach Mitternacht wieder öffnet.
────────────────────────────────────────────────────────────── */

/**
 * Prüft, ob heute schon gelernt wurde.
 * (Kein echter Reset nötig — Aktivität ist tagesbasiert in data.js.)
 * Kann hier für zukünftige tägliche Aktionen erweitert werden.
 */
function checkDailyReset() {
  const settings = getSettings();

  // Letzten Besuch speichern (für zukünftige Streak-Logik)
  const lastVisit = lsGet('lumina_last_visit', null);
  const today     = getTodayKey();

  if (lastVisit !== today) {
    lsSet('lumina_last_visit', today);
    // Hier könnten zukünftig tägliche Aktionen ausgelöst werden
    // z.B. Erinnerungen, tägliche Challenges etc.
  }
}
