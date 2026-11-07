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

## Commute Mode (V2.4)

Short, source-linked **Listen & Recall** sessions for 5, 10, or 15 minutes (maximum 6, 12, or 18 cards respectively). Question priority: unresolved incorrectly answered questions, your saved difficult questions, then remaining course questions. An original networking sample is available with one click.

- Listen to a spoken question with the browser's built-in Web Speech API, think for 5 seconds, then hear the stored source/reference answer. **All text is visible as an accessible fallback.** You may reveal answers without audio.
- Tap **Got it** or **Review again** to save a *self-reported* review. These ratings do not modify automatically graded exam accuracy. Questions marked difficult are saved in your local review list.
- Sessions have a wall-clock limit and survive refresh. If the session time expires, an honest review report appears; unreviewed questions are not counted as completed.
- Commute history and saved cards are included in the same version-1 JSON backup, and old backups import without resetting their courses or exam data.
- No account, microphone, AI API, sound files, or network connection needed for quiz/review itself. Browser-provided speech voices may require an OS/browser voice download. Playback while the screen is locked or the tab is backgrounded is not guaranteed; **do not use while driving or where attention to surroundings is required.**

Run `node tests/commute.test.cjs` and `python tests/commute_browser.py`. Verify voice output on your target phone; automated tests check controls and no-audio fallbacks, not audible speaker output.

## Concept Map (V2.6; upgraded from Study Canvas V2.5)

The **Concept Map** organizes your own ideas visually inside each course. Create and edit colored sticky notes, drag them around an independently scrollable board, connect related notes, and build a topic-based map from the course topics already present. Pin an existing practice question (with its stored reference answer) directly from the question bank. The map does not invent new concepts and is not an AI mind-map generator. There is one board per course, stored in the same browser-local backup as the rest of Syllasprint. Older v1 backups remain compatible. Course deletion removes its board.

Concept Map is intentionally a focused learning feature, not a replacement for Miro or Sprawl's full infinite canvas, drawing tools, and export formats. Keep longer study materials in Courses/Study Mode and use Canvas for relationships and quick notes.

Tests: `node tests/canvas.test.cjs`. The delivered source ZIP additionally includes a Chromium browser smoke test for creating, editing, linking, dragging, reloading, importing and exporting notes on mobile.

### Source-linked concepts and targeted practice (V2.6)

Existing course boards and their JSON backup fields are retained without migration. Concept Map lets you assign a sticky note to an existing course topic and a real uploaded lecture, optionally with a verified PDF page number. No sources, citations or page numbers are invented. Cards pinned from the question bank inherit the question's stored source excerpt and page where available. On the map, a card marked CONFIDENCE GAP reflects a high-confidence mistake on a linked question's latest graded attempt; a successful retake clears the status automatically. Click Study on a card to see the linked reference and launch a targeted Exam Room session containing only the pinned question or questions explicitly assigned to that topic. Untagged manual notes stay usable without claiming unsupported practice links.

Current limitations: Topic maps connect concepts via course topic IDs and pinned question IDs, not semantic matching. A lecture stored as unpaginated text cannot provide accurate PDF page links. PDF.js is still needed to import new PDFs and may require network access. The Concept Map is a course-learning workspace, not a general-purpose team whiteboard.

Regression checks: node tests/concept.test.cjs and python tests/concept_browser.py.
