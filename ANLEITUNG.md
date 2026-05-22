# Lumina — Einrichtungsanleitung
## Firebase Sync + PWA Installation auf iPhone/iPad

---

## SCHRITT 1 — Firebase: Anonyme Authentifizierung aktivieren

Damit die automatische Synchronisierung funktioniert, muss Firebase
die anonyme Anmeldung erlauben.

1. Gehe zu: https://console.firebase.google.com
2. Wähle dein Projekt **lumina-app**
3. Klick links in der Seitenleiste auf **"Sicherheit"** → **"Authentication"**
   (oder suche nach "Authentication" in der Suchleiste)
4. Klick auf den Tab **"Sign-in method"**
5. Klick auf **"Anonym"** oder **"Anonymous"**
6. Schalte es **ein** (Toggle auf blau)
7. Klick auf **Speichern**

---

## SCHRITT 2 — Firestore: Sicherheitsregeln anpassen

1. Gehe links auf **"Firestore"**
2. Klick auf den Tab **"Regeln"**
3. Ersetze den gesamten Inhalt mit diesem Text:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{document} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

4. Klick auf **"Veröffentlichen"**

Diese Regeln sorgen dafür, dass nur du auf deine eigenen Daten zugreifen kannst.

---

## SCHRITT 3 — App auf einem Webserver öffnen

Lumina muss über einen Webserver laufen (nicht direkt als Datei im Finder),
damit Firebase und der Service Worker funktionieren.

**Einfachste Methode — VS Code Live Server:**
1. Installiere VS Code (kostenlos)
2. Installiere die Erweiterung "Live Server"
3. Öffne den Lumina-Ordner in VS Code
4. Klick unten rechts auf "Go Live"
5. Lumina öffnet sich unter http://127.0.0.1:5500

**Oder GitHub Pages (für Zugriff von allen Geräten):**
→ Siehe Schritt 4

---

## SCHRITT 4 — GitHub Pages (optional, für Zugriff überall)

Damit du Lumina von iPhone, iPad und MacBook aufrufen kannst:

1. Erstelle einen kostenlosen Account auf https://github.com
2. Erstelle ein neues Repository namens "lumina"
3. Lade alle Lumina-Dateien hoch
4. Gehe zu Settings → Pages → Source: main branch
5. Deine App ist dann erreichbar unter:
   https://DEINNAME.github.io/lumina

---

## SCHRITT 5 — Als App auf iPhone/iPad installieren

1. Öffne Lumina im **Safari-Browser** auf dem iPhone/iPad
2. Tippe auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben)
3. Scrolle und wähle **"Zum Home-Bildschirm"**
4. Gib als Namen **"Lumina"** ein
5. Tippe auf **"Hinzufügen"**

Lumina erscheint jetzt als App auf deinem Homescreen — ohne App Store,
komplett kostenlos.

---

## App-Icon erstellen

Wenn du dein eigenes Lumina-Icon gestaltet hast:

1. Erstelle das Icon als PNG in diesen Größen:
   - icon-192.png (192 × 192 Pixel)
   - icon-512.png (512 × 512 Pixel)
   - icon-180.png (180 × 180 Pixel) ← für iPhone Homescreen

2. Lege die Dateien in den Lumina-Ordner

Tipp: Canva.com bietet kostenlose App-Icon-Vorlagen.
Das SVG-Icon (icon.svg) im Lumina-Ordner kannst du als Vorlage verwenden.

---

## Wie die Synchronisierung funktioniert

- Beim ersten Öffnen auf einem neuen Gerät: Lumina lädt automatisch
  alle deine Daten aus der Firebase-Cloud
- Jedes Mal wenn du eine Karte lernst, einen Stapel erstellst oder
  etwas speicherst: wird es automatisch hochgeladen
- Auf dem nächsten Gerät: einfach Lumina öffnen → alles ist da

Die Synchronisierung läuft im Hintergrund — du siehst unten links
in der Sidebar einen kleinen grünen Punkt wenn alles verbunden ist.

---

## Häufige Fragen

**Funktioniert Lumina auch ohne Internet?**
Ja — dank Service Worker werden alle App-Dateien gecacht.
Du kannst lernen ohne WLAN. Änderungen werden synchronisiert
sobald wieder eine Verbindung besteht.

**Sind meine Daten sicher?**
Ja — die Firestore-Regeln aus Schritt 2 stellen sicher,
dass nur du auf deine Daten zugreifen kannst.

**Was kostet Firebase?**
Der Spark-Tarif (kostenlos) reicht für Lumina vollständig aus.
Limits: 1 GB Speicher, 50.000 Lesevorgänge/Tag — mehr als genug.
