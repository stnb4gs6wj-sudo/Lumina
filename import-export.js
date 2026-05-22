/* ═══════════════════════════════════════════════════════════════
   LUMINA — import-export.js
   Import/Export-System:
   - Datei-Upload (.txt, .csv, .json)
   - Text-Direkteingabe
   - Automatisches Parsing (Trennzeichen, Paarweise, JSON)
   - Lumina JSON-Export (alle Decks)
   - Download als Datei
   - Vollständige Fehlerbehandlung
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   IMPORT — Datei lesen
────────────────────────────────────────────────────────────── */

/**
 * Liest eine hochgeladene Datei als Text und gibt den Inhalt zurück.
 * Unterstützt: .txt, .csv, .json
 *
 * @param {File} file  Die hochgeladene Datei
 * @returns {Promise<string>}  Dateiinhalt als String
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Keine Datei ausgewählt.'));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB Limit
    if (file.size > maxSize) {
      reject(new Error('Datei ist zu groß (max. 5 MB).'));
      return;
    }

    const allowedTypes = ['text/plain', 'text/csv', 'application/json', ''];
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['txt', 'csv', 'json', 'md'];

    if (!allowedExts.includes(ext)) {
      reject(new Error(`Dateiformat ".${ext}" wird nicht unterstützt. Bitte .txt, .csv oder .json verwenden.`));
      return;
    }

    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsText(file, 'UTF-8');
  });
}

/* ──────────────────────────────────────────────────────────────
   IMPORT — Hauptfunktion
────────────────────────────────────────────────────────────── */

/**
 * Verarbeitet den Import-Vorgang:
 * 1. Liest Datei oder Text
 * 2. Parst Karten mit parseImportText() aus data.js
 * 3. Erstellt Deck (neu oder findet existierendes)
 * 4. Fügt Karten hinzu
 * 5. Zeigt Ergebnis als Toast
 *
 * Wird von script.js als Handler für den "Importieren"-Button verwendet.
 */
async function handleImport() {
  const deckNameInput = document.getElementById('import-deck-name');
  const fileInput     = document.getElementById('import-file');
  const textInput     = document.getElementById('import-text');

  // Validierung: Deck-Name
  const deckName = deckNameInput?.value.trim();
  if (!deckName) {
    showToast('Bitte einen Stapel-Namen eingeben.');
    deckNameInput?.focus();
    return;
  }

  let rawText = '';

  // Datei hat Priorität über Text-Eingabe
  const file = fileInput?.files?.[0];

  if (file) {
    try {
      rawText = await readFileAsText(file);
    } catch (err) {
      showToast(`Fehler: ${err.message}`);
      return;
    }
  } else {
    rawText = textInput?.value.trim();
    if (!rawText) {
      showToast('Bitte eine Datei auswählen oder Text einfügen.');
      return;
    }
  }

  // Parsen
  let cards;
  try {
    cards = parseImportText(rawText);
  } catch (err) {
    showToast('Fehler beim Verarbeiten des Textes.');
    return;
  }

  if (cards.length === 0) {
    showToast('Keine Karten erkannt. Prüfe das Format: "Frage ; Antwort"');
    return;
  }

  // Existierendes Deck suchen oder neues erstellen
  const existingDecks = getDecks();
  let deck = existingDecks.find(d =>
    d.name.toLowerCase() === deckName.toLowerCase()
  );

  if (!deck) {
    // Zufällige Farbe aus DECK_COLORS
    const color = DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)].value;
    deck = createDeck({ name: deckName, description: 'Importiert', color, icon: '📥' });
  }

  // Karten hinzufügen (Duplikate prüfen: gleiche Vorderseite überspringen)
  const existingFronts = new Set(deck.cards.map(c => c.front.toLowerCase()));
  let addedCount    = 0;
  let skippedCount  = 0;

  for (const card of cards) {
    if (existingFronts.has(card.front.toLowerCase())) {
      skippedCount++;
      continue;
    }
    addCardToDeck(deck.id, card);
    existingFronts.add(card.front.toLowerCase());
    addedCount++;
  }

  // Modal schließen und aufräumen
  closeModal('modal-import');
  resetImportForm();

  // Bibliothek neu rendern
  renderLibrary();

  // Ergebnis-Toast
  let msg = `✦ ${addedCount} Karten in "${deckName}" importiert`;
  if (skippedCount > 0) msg += ` (${skippedCount} Duplikate übersprungen)`;
  showToast(msg, 3500);
}

/**
 * Setzt das Import-Formular zurück.
 */
function resetImportForm() {
  const fields = ['import-deck-name', 'import-text'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const fileInput = document.getElementById('import-file');
  if (fileInput) fileInput.value = '';
}

/* ──────────────────────────────────────────────────────────────
   EXPORT — alle Decks als JSON
────────────────────────────────────────────────────────────── */

/**
 * Exportiert alle Decks als JSON-Datei und startet den Download.
 * Dateiname: lumina-export-YYYY-MM-DD.json
 */
function handleExport() {
  const decks = getDecks();

  if (decks.length === 0) {
    showToast('Keine Stapel zum Exportieren vorhanden.');
    return;
  }

  const jsonString = exportAllDecksAsJSON();
  const filename   = `lumina-export-${getTodayKey()}.json`;

  downloadTextFile(jsonString, filename, 'application/json');
  showToast(`✦ ${decks.length} Stapel exportiert`);
}

/* ──────────────────────────────────────────────────────────────
   DOWNLOAD-HILFSFUNKTION
────────────────────────────────────────────────────────────── */

/**
 * Erstellt einen temporären Download-Link und startet den Download.
 *
 * @param {string} content   Dateiinhalt als String
 * @param {string} filename  Dateiname
 * @param {string} mimeType  MIME-Typ (z.B. 'application/json')
 */
function downloadTextFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Aufräumen
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}

/* ──────────────────────────────────────────────────────────────
   FILE-INPUT VORSCHAU
────────────────────────────────────────────────────────────── */

/**
 * Aktualisiert die Vorschau-Info wenn eine Datei ausgewählt wird.
 * Wird von script.js als change-Handler am File-Input registriert.
 */
function handleFileInputChange(e) {
  const file    = e.target.files?.[0];
  const textEl  = document.getElementById('import-text');
  const nameIn  = document.getElementById('import-deck-name');

  if (!file) return;

  // Deck-Name aus Dateinamen vorschlagen (ohne Erweiterung)
  if (nameIn && !nameIn.value.trim()) {
    const suggested = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    nameIn.value = suggested.charAt(0).toUpperCase() + suggested.slice(1);
  }

  // Datei direkt in Text-Preview laden (für Vorschau im Textarea)
  const reader = new FileReader();
  reader.onload = (ev) => {
    if (textEl) {
      const preview = ev.target.result.slice(0, 300);
      textEl.placeholder = `Vorschau: ${preview}${ev.target.result.length > 300 ? '…' : ''}`;
    }
  };
  reader.readAsText(file, 'UTF-8');
}

/* ──────────────────────────────────────────────────────────────
   LISTENER-INITIALISIERUNG
   Wird von script.js einmal aufgerufen.
────────────────────────────────────────────────────────────── */

/**
 * Registriert alle Import/Export Event-Listener.
 */
function initImportExportListeners() {

  // Import-Button in Bibliothek-Header → Modal öffnen
  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      resetImportForm();
      openModal('modal-import');
    });
  }

  // Export-Button in Bibliothek-Header
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExport);
  }

  // Abbrechen im Import-Modal
  const cancelImport = document.getElementById('cancel-import');
  if (cancelImport) {
    cancelImport.addEventListener('click', () => closeModal('modal-import'));
  }

  // Import bestätigen
  const confirmImport = document.getElementById('confirm-import');
  if (confirmImport) {
    confirmImport.addEventListener('click', handleImport);
  }

  // Datei-Input: Vorschau und Namens-Vorschlag
  const fileInput = document.getElementById('import-file');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileInputChange);
  }

  // Import-Modal: Klick auf Overlay schließt es
  const importModal = document.getElementById('modal-import');
  if (importModal) {
    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) closeModal('modal-import');
    });
  }
}
