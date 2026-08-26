# Poet's Eye

**Drop a photo, receive a poem.**

Poet's Eye looks at your photos the way a poet would — noticing what's specific, what's in tension, what's absent, not just what's present — and distills that observation into a haiku.

The poem isn't the product. The observation is.

Live: https://poetseye.up.railway.app/

---

## How it works

```
┌─────────────────────┐
│     Your Photo      │
│   (compressed to    │
│  1024px client-side) │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│     Generator       │
│   GPT-4o vision     │
│   Temperature: 0.9  │
│                     │
│   Sees: image       │
│   Has: haiku spec,  │
│   11 reference haiku│
│   5 negative examples│
│   poet's eye prompt │
│                     │
│   Produces: 5 haiku │
│     candidates      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│     Evaluator       │
│   GPT-4o vision     │
│   Temperature: 0.3  │
│                     │
│   Sees: image + 5   │
│     candidates      │
│   Judges on:        │
│   1. Did it see well│
│   2. Concrete vs    │
│      abstract       │
│   3. Last line      │
│   4. Originality    │
│   5. Show don't tell│
│                     │
│   Returns: winner   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  The winning haiku  │
│  displayed next to  │
│     your photo      │
└─────────────────────┘
```

### The prompt stack

The generator's system prompt is assembled from three layers, read from disk on every request:

**Layer 1 — Haiku spec** (`haiku-spec.md`): What a haiku is, what it's not, how the cut works, what the last line should do, and a banned words list. The model enters the task as a poet with clear standards.

**Layer 2 — Reference examples** (`haiku-references.json`): 11 positive examples tagged by technique (cut, absence, small-carries-large, humor, tension, mundane-setting, sensory-anchor). 5 negative examples with explanations of why they fail. References calibrate sensibility without being templates to copy.

**Layer 3 — Poet's eye identity**: The observation persona — Indian cultural lens ("you see the world as someone who lives in it, not someone visiting"), accuracy rules, and four internal observation steps the model works through before writing.

### Why generate then evaluate?

A single generation is inconsistent. Best-of-5 with a separate evaluator produces at least one strong candidate per image. The evaluator is a separate API call — it judges cold, without the bias of having written the poems. It also sees the original image, so it can assess whether the haiku found the most interesting detail, not just whether the craft is sound.

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite + Tailwind | Fast iteration |
| Backend | Express.js | Lightweight, same language as frontend |
| AI | GPT-4o vision | Vision built-in, existing API credits |
| Deployment | Railway | Handles long-running requests (two sequential LLM calls) |
| Design | CSS paper texture | Sepia/warm brown palette, no external assets |

---

## Project structure

```
├── server/index.js          Express server + /api/haiku
├── src/App.jsx              Frontend (single component)
├── src/index.css            Paper texture, animations
├── public/samples/          Showcase images
├── poetry-cam/
│   ├── haiku-spec.md        Haiku craft specification
│   ├── haiku-references.json 11 positive + 5 negative examples
│   ├── generate.js          Standalone test harness
│   ├── batch-generate.js    Batch testing
│   └── archive/             Old two-layer observation scripts
├── architecture.md          System design + key decisions
├── build-journal.md         Full build narrative
├── milestones.md            Issue tracking
├── package.json
└── vite.config.js
```

---

## Run locally

```bash
git clone https://github.com/[your-username]/poets-eye.git
cd poets-eye
npm install
```

Create a `.env` file:
```
OPENAI_API_KEY=your-key-here
```

Development (hot reload):
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

---

## Research harness

The `poetry-cam/` folder contains standalone scripts for testing prompts without running the full web app:

```bash
node poetry-cam/generate.js ./path/to/image.jpg
node poetry-cam/batch-generate.js
```

The `archive/` subfolder contains the original two-layer observation scripts that were abandoned after testing — kept for reference.

---

## What's next

- Usage limits — rate limiting before sharing widely
- Cross-model evaluation — generate with GPT-4o, evaluate with Claude
- Share cards — shareable image with photo + haiku overlaid
- Better handling of minimal/monochrome images
