# Callback

**Fail here. Not there.**

Callback ist ein KI-gestützter Interview-Coach für Studierende und Berufseinsteiger. Man übt Vorstellungsgespräche, Assessment Center und Case Interviews mit einer KI und bekommt danach strukturiertes Feedback, bevor es im echten Gespräch darauf ankommt.

> **Status:** Prototyp. Entstanden als eigenes Projekt, um eine Produktidee und ihr Geschäftsmodell greifbar zu machen.

**Demo:** https://claussec.github.io/callback-interview-coach/

![Startseite von Callback](screenshots/home-light.jpg)

## Die Idee

Bewerbungsratgeber gibt es viele. Was fehlt, ist ein Ort, an dem man Fehler machen darf, bevor sie etwas kosten. Callback führt Schritt für Schritt: Statt Menüs und Reitern zeigt die Startseite immer nur den einen nächsten Schritt, der für die eigene Bewerbung gerade am meisten bringt.

## Funktionen

- **Geführter Einstieg:** Ein Satz beschreibt das Ziel („Ich übe für Trainee Finance bei Siemens …“). Der Fachbereich wird automatisch aus Stelle und Stellenanzeige erkannt und lässt sich ändern.
- **Interview-Simulation:** Die KI spielt Recruiter oder Fachbereich und fragt passend zu Lebenslauf und Stelle.
- **Assessment Center:** Gruppendiskussion, Rollenspiele, Präsentation und Postkorb mit Bewertung wie von echten Beobachtern.
- **Case Interviews** für Beratung und strategische Rollen.
- **Unterlagen-Check:** Lebenslauf gegen die Stellenanzeige, daraus entstehen die wahrscheinlichsten Fragen.
- **Kurzübungen und Tests:** Selbstpräsentation, Rückfragen, Kopfrechnen und Zahlenreihen.
- **Spickzettel** für den Tag des Gesprächs.
- **Fortschritt:** sechs Meilensteine im Ring um die animierte Kugel.
- Deutsch und Englisch, Hell- und Dunkelmodus, für Handy und Desktop.

| Dunkelmodus | Handy | Einführung |
|---|---|---|
| ![Dunkelmodus](screenshots/home-dark.jpg) | ![Handyansicht](screenshots/mobile.jpg) | ![Einführung](screenshots/onboarding.jpg) |

## Geschäftsmodell (Konzept)

Freemium: Kurzübungen und Tests sind kostenlos, ganze Simulationen sind pro Woche begrenzt. Ein zeitlich begrenzter Bewerbungs-Pass schaltet alles für die heiße Phase einer Bewerbung frei.

## Technik

- Eine einzige Datei (`index.html`) mit HTML, CSS und JavaScript, ohne Framework und ohne Build-Schritt.
- Daten bleiben im Browser (localStorage). Der Lebenslauf wird lokal gelesen, Kontaktdaten werden vor der Auswertung entfernt.
- Die KI-Funktionen nutzen die Laufzeitumgebung von Claude-Artifacts. **In der GitHub-Demo laufen sie deshalb nicht**; Startseite, Design, Tests und Kopfrechnen funktionieren. Für einen eigenständigen Betrieb bräuchte es einen kleinen Server, der die KI-Anfragen mit einem eigenen API-Schlüssel weiterleitet.

## Entstehung

Idee, Produktkonzept, Nutzerführung und Gestaltung stammen von mir. Den Code habe ich gemeinsam mit der KI Claude (Anthropic) entwickelt: Ich habe beschrieben, entschieden und getestet, Claude hat einen Großteil des Codes geschrieben.

## Lizenz

[MIT](LICENSE) © 2026 Clemens Claussen
