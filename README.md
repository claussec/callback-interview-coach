# Callback

**Fail here. Not there.**

Callback is an AI-powered interview coach for students and graduates. You rehearse job interviews, assessment centres and case interviews with an AI and get structured feedback before it counts in the real conversation.

> **Status:** Prototype. A personal project to make a product idea and its business model tangible.

**Demo:** https://claussec.github.io/callback-interview-coach/

![Callback home screen](screenshots/home-light.jpg)

## The idea

There is no shortage of application advice. What is missing is a place where you are allowed to make mistakes before they cost you anything. Callback guides you step by step: instead of menus and tabs, the home screen only ever shows the one next step that helps your application most right now.

## Features

- **Guided start:** One sentence describes your goal ("I'm practising for Trainee Finance at Siemens …"). The field is detected automatically from the role and job ad and can be edited.
- **Interview simulation:** The AI plays the recruiter or hiring manager and asks questions based on your CV and the role.
- **Assessment centre:** Group discussion, role plays, presentation and in-tray exercise, scored like real assessors would.
- **Case interviews** for consulting and strategy roles.
- **Document check:** Your CV against the job ad, which also produces the questions you are most likely to get.
- **Short drills and tests:** Self-introduction, questions for the interviewer, mental maths and number series.
- **Cheat sheet** for the day of the interview.
- **Progress:** six milestones on the ring around the animated orb.
- German and English, light and dark mode, mobile and desktop.

| Dark mode | Mobile | Onboarding |
|---|---|---|
| ![Dark mode](screenshots/home-dark.jpg) | ![Mobile view](screenshots/mobile.jpg) | ![Onboarding](screenshots/onboarding.jpg) |

## Privacy

- **Public demo (GitHub Pages):** no AI calls, no tracking, nothing leaves the browser apart from loading the page itself from GitHub.
- **Claude version:** AI features send the user's input to Claude (Anthropic) through the user's own Claude access. A pseudonymous usage count (days, exercise types, scores; no answers or documents) helps improve the prototype.

## Business model (concept)

Freemium: short drills and tests are free, full simulations are limited per week. A time-limited Application Pass unlocks everything for the busy phase of an application.

## Tech

- A single file (`index.html`) with HTML, CSS and JavaScript, no framework and no build step.
- Data stays in the browser (localStorage). There is no account and no backend. The CV is read locally, and contact details are removed before analysis.
- No third-party requests: fonts are served from this repository, and the public demo has no tracking.
- The AI features rely on the Claude Artifacts runtime. **They therefore do not run in the GitHub demo**; the home screen, design, tests and mental maths work. Running it standalone would need a small server that forwards AI requests with its own API key.

## How it was built

The idea, product concept, user flow and design direction are mine. I developed the code together with the AI Claude (Anthropic): I described, decided and tested, and Claude wrote most of the code.

## License

[MIT](LICENSE) © 2026 Clemens Claussen
