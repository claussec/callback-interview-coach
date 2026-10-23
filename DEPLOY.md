# Callback auf einem eigenen Server (Hetzner)

*How to run Callback with real AI outside Claude, on a small Hetzner Cloud server. Written in German for the project owner.*

Auf dem eigenen Server läuft Callback komplett: KI-Interviews, Video-Modus mit Kamera, Sprech- und Körpersprache-Analyse und die Tester-Statistik. Der Server leitet die KI-Anfragen an die Claude-API weiter; dein API-Schlüssel bleibt auf dem Server und erreicht nie den Browser.

```
Browser ──HTTPS──▶ Caddy (Zertifikat automatisch) ──▶ server/server.mjs ──▶ Claude-API
                                                        │
                                                        └─ data/usage/*.json (anonyme Tester-Statistik)
```

## Was du brauchst

| | Was | Ungefähre Kosten |
|---|---|---|
| **Server** | Hetzner Cloud, kleinster *Shared vCPU*-Server der x86-Reihe (aktuell **CX23**: 2 vCPU, 4 GB RAM, 40 GB), Standort **Nürnberg oder Falkenstein**, Betriebssystem **Ubuntu 24.04** | einige Euro pro Monat, aktuellen Preis auf hetzner.com prüfen |
| **Domain** | z. B. `callback-coach.de`, bei einem beliebigen Anbieter (auch bei Hetzner) | ca. 5–15 € pro Jahr |
| **Claude-API** | Konto auf platform.claude.com, Guthaben aufladen, API-Schlüssel anlegen | nach Nutzung, siehe unten |

Mehr Leistung brauchst du nicht: Der Server leitet nur Anfragen weiter, die Rechenarbeit macht die Claude-API.

## Schritt für Schritt

**1. SSH-Schlüssel anlegen** (einmalig, auf deinem Computer). Damit meldest du dich ohne Passwort sicher am Server an.
```bash
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub     # diese Zeile kopierst du gleich zu Hetzner
```

**2. Server bei Hetzner anlegen.** In der Hetzner Cloud Console: *Projekt anlegen → Server hinzufügen* → Standort Nürnberg/Falkenstein → Ubuntu 24.04 → Typ *Shared vCPU, x86*, kleinste Größe → unter *SSH-Keys* den kopierten Schlüssel einfügen → *Erstellen*. Notiere die angezeigte **IPv4-Adresse**.

**3. Domain auf den Server zeigen lassen.** Beim Domain-Anbieter einen **A-Record** anlegen: Name `@` (oder z. B. `app`), Wert = IPv4-Adresse des Servers. Es kann ein paar Minuten dauern, bis das gilt.

**4. Einrichten** (ein Befehl, dauert ein paar Minuten):
```bash
ssh root@DEINE-IP
curl -fsSL https://raw.githubusercontent.com/claussec/callback-interview-coach/main/deploy/setup.sh -o setup.sh
less setup.sh                 # kurz ansehen, was das Skript tut (q zum Beenden)
bash setup.sh deine-domain.de
```
Das Skript installiert Updates, eine Firewall (nur SSH, HTTP, HTTPS offen), automatische Sicherheitsupdates, Node.js 22, den Webserver Caddy (holt das HTTPS-Zertifikat selbst) und Callback als eigenen, abgeschotteten Dienst.

**5. API-Schlüssel und Zugangscode eintragen:**
```bash
nano /etc/callback.env
```
- `ANTHROPIC_API_KEY=` → deinen Schlüssel einfügen
- `ACCESS_CODE=` → einen Code für deine Tester, z. B. `callback-test-2026`. Solange er gesetzt ist, funktioniert die KI nur mit diesem Code. So kann niemand Fremdes auf deine Kosten üben.
- Speichern mit `Strg+O`, `Enter`, `Strg+X`.

```bash
systemctl restart callback
systemctl status callback      # sollte "active (running)" zeigen
```

**6. Öffnen:** `https://deine-domain.de`. Oben erscheint die Abfrage des Zugangscodes.

**7. Deine Auswertung:** Am Ende von Schritt 4 zeigt das Skript einen **Admin-Link** (`https://deine-domain.de/#admin=…`). Öffne ihn einmal in deinem Browser; danach siehst du unten auf der Seite „Auswertung (nur für dich sichtbar)“. Den Link niemandem geben.

## Laufender Betrieb

| Aufgabe | Befehl |
|---|---|
| Neue Version von GitHub einspielen | `bash /opt/callback/deploy/update.sh` |
| Live-Log ansehen | `journalctl -u callback -f` |
| Neu starten | `systemctl restart callback` |
| Tester-Statistik sichern | `tar czf usage.tgz /opt/callback/server/data` |

## Kosten im Griff behalten

- **Ausgabenlimit setzen:** In der Claude Console ein monatliches Limit festlegen. Das ist die wichtigste Absicherung.
- **Grenzen im Server:** `DAILY_LIMIT` (alle Nutzer zusammen pro Tag) und `PER_IP_HOURLY` (pro Person und Stunde) in `/etc/callback.env`.
- **Welches Modell was macht:** Der Server wählt pro Aufgabe das passende Modell:

  | Aufgabe | Modell | Warum |
  |---|---|---|
  | Bewertungsbogen, Unterlagen-Check, Video-Bewertung, Case erstellen | Claude Opus 5.5 | Hier zählt ein genaues Urteil; eine falsche Bewertung führt in die Irre |
  | Interviewer-Antworten, Kurzübungen, Spickzettel, Fragen zum Feedback | Claude Sonnet 5.5 | schnell und natürlich im Gespräch, etwa halb so teuer |
  | Lebenslauf lesen, Bereich erkennen, Tipps | Claude Haiku 5.5 | einfache Aufgaben, sehr günstig |

  Grob geschätzt kostet ein komplettes Interview damit etwa 0,20–0,40 € statt 0,30–0,80 € mit Opus für alles. Gemessen ist das noch nicht.
- **Echte Zahlen:** Deine Auswertung zeigt unter „KI-Kosten“ für jeden Monat, was jede Aufgabe mit welchem Modell kostet, und den Durchschnitt pro Gespräch (Schätzung mit Listenpreisen; die echte Rechnung steht in der Claude Console).
- **Ändern:** in `/etc/callback.env` einzelne Aufgaben umstellen, z. B. `ROUTES={"turn":{"model":"claude-opus-5-5"}}`, oder mit `CLAUDE_MODEL=claude-opus-5-5` alles auf ein Modell setzen. Danach `systemctl restart callback`.

## Rechtliches (vor dem Teilen erledigen)

Das ist keine Rechtsberatung, aber eine Checkliste für eine öffentlich erreichbare Seite in Deutschland:

1. **Impressum** und **Datenschutzerklärung** ausfüllen: Vorlagen liegen in `legal/`. Die gelb markierten Stellen ergänzen und mit einem Generator (z. B. e-recht24.de oder datenschutz-generator.de) abgleichen.
2. **Auftragsverarbeitungsvertrag (AVV) mit Hetzner** abschließen, geht in der Hetzner Console.
3. **Anthropic:** In der Datenschutzerklärung erwähnen, dass Eingaben zur Auswertung an Anthropic (USA) gehen, und die aktuellen Bedingungen von Anthropic verlinken.
4. Solange nur eingeladene Tester mit Zugangscode die KI nutzen, bleibt das Risiko überschaubar. Vor einem öffentlichen Start alles einmal prüfen lassen.

## Lokal ausprobieren, ohne Kosten

```bash
cd server && npm install
MOCK_AI=1 ACCESS_CODE=test ADMIN_TOKEN=admin node server.mjs
# http://127.0.0.1:8080 öffnen, Code "test"; die KI antwortet mit Testtexten
```
