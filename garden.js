/* ═══════════════════════════════════════════════════════════════
   LUMINA — garden.js
   Garten-System:
   - Blumen-Freischaltungs-Animation
   - Rarity-Effekte
   - Erweiterbare Garten-Logik
   - Animiertes Unlock-Banner
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   BLUMEN-FREISCHALTUNG ANZEIGEN
────────────────────────────────────────────────────────────── */

/**
 * Zeigt eine elegante Blumen-Freischaltungs-Animation an.
 * Wird von learn.js aufgerufen, wenn eine neue Blume verdient wurde.
 *
 * @param {Object} flower  Blumen-Objekt {emoji, name, rarity, day}
 */
function triggerFlowerUnlock(flower) {
  // Altes Banner entfernen falls noch vorhanden
  const existing = document.getElementById('flower-unlock-banner');
  if (existing) existing.remove();

  const rarityLabels = {
    common:    'Gewöhnlich',
    uncommon:  'Ungewöhnlich ✦',
    rare:      'Selten ✦✦',
    legendary: 'Legendär ✦✦✦',
  };

  const rarityColors = {
    common:    '#9b7fe8',
    uncommon:  '#6da3d8',
    rare:      '#d87fb0',
    legendary: '#f0c060',
  };

  const color = rarityColors[flower.rarity] || '#9b7fe8';
  const label = rarityLabels[flower.rarity] || '';

  // Banner-Element erstellen
  const banner = document.createElement('div');
  banner.id = 'flower-unlock-banner';
  banner.innerHTML = `
    <div class="flower-unlock-inner">
      <div class="flower-unlock-emoji">${flower.emoji}</div>
      <div class="flower-unlock-text">
        <p class="flower-unlock-sub">Neue Blume freigeschaltet</p>
        <p class="flower-unlock-name">${flower.name}</p>
        <p class="flower-unlock-rarity" style="color:${color}">${label}</p>
      </div>
    </div>
  `;

  // Inline-Styles für das Banner (kein extra CSS nötig)
  Object.assign(banner.style, {
    position:        'fixed',
    bottom:          '5rem',
    left:            '50%',
    transform:       'translateX(-50%) translateY(30px)',
    background:      'var(--bg-elevated)',
    border:          `1px solid ${color}40`,
    borderRadius:    '20px',
    padding:         '1rem 1.5rem',
    boxShadow:       `0 8px 32px ${color}30`,
    zIndex:          '3000',
    opacity:         '0',
    transition:      'opacity 400ms ease, transform 400ms cubic-bezier(0.16,1,0.3,1)',
    minWidth:        '260px',
    backdropFilter:  'blur(12px)',
  });

  // Inner-Styles
  const inner = banner.querySelector('.flower-unlock-inner');
  if (inner) {
    Object.assign(inner.style, {
      display:    'flex',
      alignItems: 'center',
      gap:        '1rem',
    });
  }

  const emojiEl = banner.querySelector('.flower-unlock-emoji');
  if (emojiEl) {
    Object.assign(emojiEl.style, {
      fontSize:  '2.5rem',
      animation: 'flowerBounce 0.6s ease infinite alternate',
    });
  }

  const subEl = banner.querySelector('.flower-unlock-sub');
  if (subEl) {
    Object.assign(subEl.style, {
      fontSize:    '0.72rem',
      color:       'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: '2px',
    });
  }

  const nameEl = banner.querySelector('.flower-unlock-name');
  if (nameEl) {
    Object.assign(nameEl.style, {
      fontFamily:  'Cormorant Garamond, serif',
      fontSize:    '1.3rem',
      color:       'var(--text-primary)',
      lineHeight:  '1.2',
    });
  }

  const rarityEl = banner.querySelector('.flower-unlock-rarity');
  if (rarityEl) {
    Object.assign(rarityEl.style, {
      fontSize: '0.78rem',
      marginTop: '2px',
    });
  }

  // Bounce-Animation als Style-Tag einfügen (einmalig)
  if (!document.getElementById('flower-keyframes')) {
    const style = document.createElement('style');
    style.id = 'flower-keyframes';
    style.textContent = `
      @keyframes flowerBounce {
        from { transform: scale(1) rotate(-5deg); }
        to   { transform: scale(1.15) rotate(5deg); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  // Einblend-Animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.opacity   = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
    });
  });

  // Nach 4 Sekunden ausblenden und entfernen
  setTimeout(() => {
    banner.style.opacity   = '0';
    banner.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => banner.remove(), 450);
  }, 4000);
}

/* ──────────────────────────────────────────────────────────────
   GARTEN-RENDERING ERWEITERUNGEN
   (Kernrendering ist in ui.js/renderGarden,
    hier nur Animations- und Interaktions-Layer)
────────────────────────────────────────────────────────────── */

/**
 * Fügt den Blumen-Karten im Garten Hover-Animationen hinzu.
 * Wird nach dem Rendern des Gartens aufgerufen.
 */
function enhanceGardenCards() {
  const cards = document.querySelectorAll('.flower-card:not(.flower-locked)');
  cards.forEach((card, i) => {
    // Gestaffelte Einblend-Animation
    card.style.opacity   = '0';
    card.style.transform = 'translateY(12px)';
    card.style.transition = `opacity 400ms ease ${i * 60}ms, transform 400ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.opacity   = '1';
        card.style.transform = 'translateY(0)';
      });
    });
  });
}

/**
 * Gibt Informationen über den Garten-Fortschritt zurück.
 * Für spätere Erweiterungen (z.B. Garten-Level, seltene Pflanzen).
 *
 * @returns {Object} { totalFlowers, nextFlowerIn, rarityBreakdown }
 */
function getGardenSummary() {
  const garden      = getGarden();
  const stats       = getTotalStats();
  const learnedDays = stats.learnedDays;

  const nextFlowerIn = 5 - (learnedDays % 5);

  const rarityBreakdown = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  for (const f of garden.flowers) {
    if (rarityBreakdown[f.rarity] !== undefined) {
      rarityBreakdown[f.rarity]++;
    }
  }

  return {
    totalFlowers:   garden.flowers.length,
    nextFlowerIn:   nextFlowerIn === 5 ? 0 : nextFlowerIn,
    learnedDays,
    rarityBreakdown,
  };
}
