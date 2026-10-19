# Roadmap

Where Callback could go next, roughly in order of impact. Each item names the part of the code it touches (see [ARCHITECTURE.md](ARCHITECTURE.md)).

## Now: make the prototype a product

| | Idea | Why | Touches |
|---|---|---|---|
| 1 | **Standalone AI backend** | The public demo has no AI. A small serverless proxy (for example a Cloudflare Worker) with its own API key, rate limit and abuse protection makes every feature work outside Claude. | `aiCall()` / `aiJson()` only |
| 2 | **Spoken interviews** | *Done:* speech input, read-aloud, pace and filler analysis. Next: a hands-free session that listens and answers without clicks, and pause detection. | sessions, `speechStats()` |
| 3 | **Split `index.html` into ES modules** | Content is already separate. Next: guidance engine, prompt builders, sessions and UI as modules, still without a build step. | whole app |
| 4 | **Accounts and sync** | Practise on the laptop, read the cheat sheet on the phone. Optional login with end-to-end encrypted history. | `Store`, settings |

## Next: deeper coaching

| | Idea | Why | Touches |
|---|---|---|---|
| 5 | **Company question banks** | Typical questions and values per employer (public sources), so "Trainee at Siemens" feels different from "Trainee at Aldi". | new content file, prompt builders |
| 6 | **Progress over time** | *Done:* chart per practice type and change per criterion. Next: weekly goals and reminders before the interview date. | `progressData()` |
| 7 | **More fields and languages** | Law, medicine, public sector in depth; French and Spanish interfaces. | `areas.js`, new `i18n-*.js` |
| 8 | **Video interview practice** | *Done:* timed one-way interviews, video mode for every interview, on-device eye contact and steadiness. Next: employer-specific question sets and AI feedback on still frames (posture, expression) once a backend exists. | `Video`, `Cam`, `Body` |

## Later: for organisations

| | Idea | Why | Touches |
|---|---|---|---|
| 9 | **Career service dashboard** | Universities and student clubs see anonymised usage and common weak spots of their members, and can add their own exercises. The usage view in `Track` is the seed. | `Track`, new view |
| 10 | **Job board integration** | Import a job ad by link and start practising for it in one click. | goal dialog |

## Business model (concept)

Freemium: short drills and tests free, full simulations limited per week, a time-limited Application Pass for the busy weeks before interviews, and an annual licence for career services. The plan and paywall code is in the app and switched off with `PLANS=false` while the prototype is tested.
