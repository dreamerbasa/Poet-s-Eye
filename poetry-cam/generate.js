require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const GENERATION_INSTRUCTION = `You are a poet's eye — one that has grown up in India and sees
the world through that lens.

You see the world as someone who lives in it, not someone
visiting it. Nothing is exotic to you. An auto-rickshaw is not
interesting because it's an auto-rickshaw — it's interesting
because the driver has taped a photo of his kid to the dashboard.
Chai is not interesting because it's chai — it's interesting
because the glass is too hot and the saucer is the real cup.
You notice the specific, not the cultural category.

Don't invent objects or people that aren't there. If you can't
tell what something is, say so. But DO interpret what you see.
There's a difference between fabricating details and seeing deeply.
Fabricating: saying there's a cat in the image when there's no cat.
Seeing deeply: noticing that someone is turned away from the
camera, not just "a person standing."
Facts must be accurate. Interpretations should be bold. You can
be wrong about what something means. You cannot be wrong about
what's physically there.

When you receive an image, work through these steps internally
before writing:

1. What is HAPPENING here? Not an inventory — the situation.
2. What one detail would you point out to someone next to you?
3. What two visible things pull against each other?
4. What's missing that should be here, or just out of frame?

Then write the haiku. Use the best material from your observations
— usually just one or two of the above, never all four. Find the
cut — two images placed side by side. Let the reader complete
the meaning.

Generate 3 haiku, each taking a different angle on the image.
Number them 1, 2, 3. Nothing else — no explanations, no
commentary.`;

const EVALUATOR_INSTRUCTION = `You are a haiku editor. You receive 3 haiku written in response
to an image. Your job is to pick the best one.
Evaluate each haiku against these criteria, in order of importance:

1. DID IT SEE WELL? — Look at the image. Which haiku found the
most interesting, non-obvious detail? Which one noticed
something that makes you look at the image again? A haiku
that picks the easy obvious subject loses to one that finds
the sharp, unexpected detail.
2. CONCRETE vs ABSTRACT — Does every word point at something
you could see, touch, hear, or smell? Any abstraction
(beauty, peace, quiet focus, whispers of night, gentle
glow) is a penalty. The more concrete and specific, the
better.
3. THE LAST LINE — Does it open a door or close one? Does it
leave the reader with something to sit with, or does it
wrap things up neatly? Open doors win.
4. ORIGINALITY — Does it feel like a fresh observation, or
assembled from haiku stock phrases? "Fairy lights dance,"
"time stands still," "whispers of night," "golden glow"
are stock. Penalize.
5. SHOW DON'T TELL — Does it name emotions or let the reader
arrive at them? Naming is a penalty.

Respond in this exact JSON format:
{
"winner": 1,
"reasoning": "2-3 sentences on why this one wins and what's
wrong with the other two. Be specific — name the exact words
or phrases that succeed or fail."
}
JSON only. No preamble.`;

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}. Run the setup first.`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function buildReferencesSection(refsData) {
  const lines = [];
  lines.push('Reference Examples');
  lines.push('These show the RANGE of what good haiku looks like. Do not copy their content, structure, or imagery. Learn the technique each one demonstrates, then generate something original.');
  lines.push('');

  for (const ref of refsData.references) {
    lines.push('EXAMPLE:');
    lines.push(ref.haiku);
    lines.push(`TECHNIQUE: ${ref.teaches}`);
    lines.push(`WHY IT WORKS: ${ref.why}`);
    lines.push('');
  }

  lines.push('What to AVOID');
  lines.push('');

  for (const neg of refsData.negative_examples) {
    lines.push('BAD:');
    lines.push(neg.haiku);
    lines.push(`WHY IT FAILS: ${neg.fails_because}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

function buildGeneratorSystemPrompt() {
  const specPath = path.join(__dirname, 'haiku-spec.md');
  const referencesPath = path.join(__dirname, 'haiku-references.json');

  const spec = readRequiredFile(specPath);
  const refsData = JSON.parse(readRequiredFile(referencesPath));
  const referencesSection = buildReferencesSection(refsData);

  return [spec.trim(), referencesSection, GENERATION_INSTRUCTION].join('\n\n');
}

function buildEvaluatorSystemPrompt() {
  const specPath = path.join(__dirname, 'haiku-spec.md');
  const spec = readRequiredFile(specPath);

  return [spec.trim(), EVALUATOR_INSTRUCTION].join('\n\n');
}

function parseCandidates(rawText) {
  const trimmed = rawText.trim();

  // "1. haiku text..." — number and punctuation inline with the first line
  let parts = trimmed
    .split(/^\s*[1-3][.\)]\s*/m)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 3) {
    return parts;
  }

  // "1" alone on its own line, haiku text starts on the next line
  parts = trimmed
    .split(/^\s*[1-3][.\)]?\s*$/m)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 3) {
    return parts;
  }

  throw new Error(`Could not parse 3 haiku from generator response (found ${parts.length}). Raw response:\n\n${rawText}`);
}

function parseEvaluatorResponse(rawText) {
  let parsed = null;
  let warning = null;

  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
      } catch (err2) {
        warning = 'Evaluator returned invalid JSON. Falling back to candidate #1.';
      }
    } else {
      warning = 'Evaluator returned invalid JSON. Falling back to candidate #1.';
    }
  }

  let winnerNumber = parsed?.winner;
  let reasoning = parsed?.reasoning;

  if (!warning && (!Number.isInteger(winnerNumber) || winnerNumber < 1 || winnerNumber > 3)) {
    warning = `Evaluator returned winner number "${winnerNumber}", outside 1-3. Falling back to candidate #1.`;
  }

  if (warning) {
    console.warn(`\nWarning: ${warning}`);
    winnerNumber = 1;
    reasoning = reasoning || '(unavailable — evaluator response could not be parsed)';
  }

  return { winnerNumber, reasoning };
}

async function generateFromImage(imagePath) {
  const resolvedPath = path.resolve(imagePath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    throw new Error(`Unsupported image type "${ext}". Use .jpg, .jpeg, .png, or .webp.`);
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Image not found: ${resolvedPath}`);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Copy poetry-cam/.env.example to poetry-cam/.env and add your key.');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const imageBuffer = fs.readFileSync(resolvedPath);
  const base64Image = imageBuffer.toString('base64');
  const imageContentBlock = {
    type: 'image_url',
    image_url: { url: `data:${mimeType};base64,${base64Image}` },
  };

  // Call 1: generator
  const generatorSystemPrompt = buildGeneratorSystemPrompt();

  const generatorCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.9,
    max_tokens: 800,
    messages: [
      { role: 'system', content: generatorSystemPrompt },
      { role: 'user', content: [imageContentBlock] },
    ],
  });

  const rawHaikuText = generatorCompletion.choices[0].message.content.trim();
  const candidates = parseCandidates(rawHaikuText);

  console.log('=== CANDIDATES ===\n');
  candidates.forEach((candidate, i) => {
    console.log(`${i + 1}.\n${candidate}\n`);
  });

  // Call 2: evaluator — separate call, no memory of the generation
  const evaluatorSystemPrompt = buildEvaluatorSystemPrompt();
  const evaluatorUserText = `Pick the best haiku for this image:\n\n${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const evaluatorCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      { role: 'system', content: evaluatorSystemPrompt },
      {
        role: 'user',
        content: [
          imageContentBlock,
          { type: 'text', text: evaluatorUserText },
        ],
      },
    ],
  });

  const { winnerNumber, reasoning } = parseEvaluatorResponse(evaluatorCompletion.choices[0].message.content);
  const selected = candidates[winnerNumber - 1];

  console.log('=== SELECTED ===\n');
  console.log(`Winner: #${winnerNumber}\n`);
  console.log(selected);
  console.log(`\nReasoning: ${reasoning}`);

  const outputsDir = path.join(__dirname, 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }

  const baseName = path.basename(resolvedPath, ext);
  const result = {
    image: path.basename(resolvedPath),
    candidates,
    selected,
    winner_number: winnerNumber,
    reasoning,
    timestamp: new Date().toISOString(),
  };
  const outputPath = path.join(outputsDir, `result_${baseName}_${timestamp()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(`\nSaved to ${outputPath}`);

  return { candidates, selected, winnerNumber, reasoning, outputPath, imagePath: resolvedPath };
}

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Usage: node generate.js <path-to-image>');
    process.exit(1);
  }

  try {
    await generateFromImage(imagePath);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateFromImage, buildGeneratorSystemPrompt, buildEvaluatorSystemPrompt, parseCandidates, parseEvaluatorResponse };
