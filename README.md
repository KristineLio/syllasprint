# Syllasprint

**Stop rereading. Start getting exam-ready.**

Syllasprint is a new, framework-free exam-practice app created for the November 2026 Skycastle **Cancel My Subscription** hackathon.

## What works

- A 10-question original sample exam, no account needed
- Confidence ratings before answer feedback
- High-confidence wrong answers flagged as **Confidence Gaps**
- Targeted retakes; corrected answers resolve active gaps
- Courses with optional exam dates
- Notes: parse `TERM :: DEFINITION` and `Q:` / `A:` pairs into real questions
- Editable multiple-choice and self-graded short-answer questions
- Persistent browser-local courses and attempts
- Accurate auto-graded accuracy, coverage, and weak-spot metrics
- JSON export/import and a responsive phone layout

No AI, PDF OCR, server synchronization, or automatic article importing is claimed.

## Run

Open `index.html` in a local server. For example:

```bash
python3 -m http.server 8000
```

Visit `http://localhost:8000`.

**VibeFlow:** `syllasprint-vibeflow.html` is a *single-file* version with embedded CSS and JavaScript, intended for a new VibeFlow HTML project. It is built from the same source as the files under `css/` and `js/`. The Skycastle submission requires a separately published new VibeFlow URL; GitHub hosting alone is not an eligible submission.

## Test

```bash
node tests/core.test.cjs
```

The core tests cover sample content, Confidence Gap detection and resolution, parser-generated questions, backup validation, and sample reset. The browser smoke test (`tests/browser_smoke.py`) uses Playwright with an in-memory storage stand-in; browser-local persistence in a published environment still needs real-world verification.

## Data and privacy

Study information is stored in this browser under the key `syllasprint_v1`. Clearing browser storage removes the data. There is no cloud sync. Use **Export JSON** regularly.

## Originality

This application was newly authored during the hackathon. No pre-existing StudyFlow source, design components, or database were copied. The product problem overlaps with study tools, so organizers should still confirm its eligibility.

## License

MIT.