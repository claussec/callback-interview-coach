# Contributing

Thanks for looking. Callback is a personal prototype, and ideas, issues and pull requests are welcome.

## Run it

No build step. Serve the folder (video mode loads an ES module and WebAssembly, which browsers do not load from `file://`):

```bash
npm run serve        # http://localhost:8080
```

AI features only work inside Claude (see [ARCHITECTURE.md](ARCHITECTURE.md#extending-it) for using your own backend). Everything else, including the demo replay, works locally.

## Test it

```bash
npm install
npx playwright install chromium
npm test
```

`tests/content.test.mjs` checks the data in `content/`, `tests/e2e.test.mjs` drives the page in Chromium. Both run on every push.

## Good first contributions

- **Add an interview type or AC exercise** in `content/interviews.js`. The content tests tell you if a reference is missing.
- **Add keywords to a field of work** in `content/areas.js` when detection picks the wrong field for a real job title. Add the title to the detection test.
- **Improve an English translation** in `content/i18n-en.js`.

## Style

- Plain JavaScript, no framework. Match the surrounding code.
- Interface text is written in German first; add the English to `i18n-en.js`, or use `L('Deutsch','English')` for text built in code.
- No third-party requests at runtime. Fonts and assets live in the repository.
