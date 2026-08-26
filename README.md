# Poet's Eye

Drop a photo, receive a poem.

Two calls to GPT-4o: one generates three candidate haiku from the image,
a second evaluates all three against the image and picks the best one.
Only the winner is shown.

## Setup

```bash
npm install
```

Create a `.env` file at the project root:

```
OPENAI_API_KEY=your-key-here
```

Then run:

```bash
npm run dev
```

## Structure

- `src/` — React + Vite frontend
- `server/` — Express backend (`POST /api/haiku`)
- `poetry-cam/` — research/testing harness for prompt development.
  The server reads `haiku-spec.md` and `haiku-references.json` from
  here at runtime, so edits apply without code changes.
