# Syllasprint

**Stop rereading. Start getting exam-ready.**

Syllasprint is a newly authored, framework-free exam-practice application for the November 2026 Skycastle **Cancel My Subscription** hackathon. Its focused workflow is **material → practice → confidence gap → targeted retake**.

## Features

- **60-second example exam** featuring 10 original networking questions, with no signup required.
- **Confidence Gap detection**: high-confidence wrong answers become active weak spots until resolved on a later retake. Retake results explicitly show gaps resolved.
- **Course workspaces** with exam dates, topics, questions, source notes, and observation-based stats.
- **Text-based lecture PDF import** (up to 100 pages, 12 MB) with page references; `.txt`, `.md`, and pasted material work too.
- **Source-grounded practice**: ordinary lecture text generates self-graded recall prompts and, where clear definitions are available, auto-graded literal concept-cloze MCQs. Explanations quote the supplied document rather than fabricating AI answers.
- **Structured note support**: `TERM :: DEFINITION` builds MCQs when there are four distinct terms; `Q:` / `A:` pairs build self-graded questions.
- **Editable questions**, accurate automatic MCQ accuracy, weak-spot filters, and local data backups using JSON export/import.
- **Mobile-friendly interface** implemented with HTML, CSS, and vanilla JavaScript. No framework, account, or server.

## Running locally

```bash
python3 -m http.server 8000
```

Visit `http://localhost:8000`.

For a brand-new Skycastle VibeFlow project, `syllasprint-vibeflow.html` provides a **single-file build** containing the same HTML, CSS, and JavaScript. A GitHub Pages link alone is **not** a qualifying VibeFlow submission.

## PDF handling and limitations

PDF.js is downloaded on demand from a public CDN, so an internet connection is needed for first PDF import. The PDF contents are processed in-browser and not uploaded by Syllasprint. Scanned/image-only PDFs require OCR outside Syllasprint. If PDF.js is blocked, paste extracted text instead.

Recall prompts generated from arbitrary prose are **heuristic and self-graded**; definition-based MCQs simply blank a concept that appears literally in the source. These are not AI-generated or academically validated. Review the questions and reference passages before relying on them. The app does not predict exam pass probabilities.

Browser-local storage does not synchronize between devices and may be cleared by the browser. Export JSON backups regularly.

## Testing

```bash
node tests/core.test.cjs
node tests/lecture.test.cjs
python tests/browser_smoke.py
```

The browser smoke test covers quizzes, Confidence Gap repair, note parsing, import UI, and mobile layout. It mocks the third-party PDF.js interface to remain repeatable offline. **The real PDF.js CDN import must also be checked on the published site** using an actual text-based lecture PDF.

To use a local PDF as the UI test fixture:

```bash
SYLLASPRINT_PDF_FIXTURE=/path/to/lecture.pdf python tests/browser_smoke.py
```

## Originality and eligibility

This project was newly authored for the event without copying pre-existing StudyFlow code, UI, databases, or assets. Organizers must still determine whether it qualifies under their new-work rule when the underlying student-study problem is related.

License: MIT.

## Guided Study Mode (new)

Syllasprint also includes a guided, five-round study path inspired by the **way a human tutor structures practice**, but implemented independently of older projects:

1. **Understand:** Read four source excerpts and explain the material in your own words.
2. **Active recall:** Answer source-linked multiple-choice or short-answer questions.
3. **Apply:** Give an example and assess your reasoning against the actual lecture excerpt.
4. **Debug / test:** Examine a real code excerpt when present, or describe a possible misconception and how to check it. **No code is executed.**
5. **Revision:** Retake weak questions, see corrections, and review a saved report.

The **Study Mode** navigation item is available on desktop and mobile. Each saved material has a **Study** button, and finished or unfinished learning sessions are visible in the Study Tracker. Guided records use the existing browser-local backup format, so JSON export/import includes them.

**Transparency:** The site is not an AI tutor. It does not autonomously explain new concepts, grade essays, execute Python, or guarantee that a generated recall prompt is pedagogically correct. Multiple-choice questions are checked automatically; open responses and code-reasoning tasks use source excerpts and transparent self-grading. Review generated questions for quality.

Run `python tests/guided_mode.py` (Chromium + Playwright required) to smoke-test all five stages, persistence and the report. Browser-local storage can still be lost if site data is cleared; back it up regularly.
### Saved answers (V2.3)

Guided Study saves written drafts as you type, retains multiple-choice selections and confidence levels, records optional Understand-stage reflections, and displays a **My saved answers** journal in the session and completion report. Browser-local data can be deleted by browser clearing: export JSON for backup.
