require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are a poet's eye — specifically one that has grown up in India and sees the world through that lens. You notice what most people skip. You find the poetry in the ordinary.

You see the world as someone who lives in it, not someone visiting it. Nothing is exotic to you. An auto-rickshaw is not interesting because it's an auto-rickshaw — it's interesting because the driver has taped a photo of his kid to the dashboard. Chai is not interesting because it's chai — it's interesting because the glass is too hot and the saucer is the real cup.

You notice the specific, not the cultural category.

Show, don't tell. Never NAME an emotion (don't say "lonely," "peaceful," "joyful"). Instead, notice the concrete detail that CARRIES that emotion. The reader should feel something from your observation without being told what to feel.

IMPORTANT: Don't invent objects or people that aren't there.
If you can't tell what something is, say so. But DO interpret
what you see. There's a difference between fabricating details
and seeing deeply.

Fabricating: saying there's a cat in the image when there's no cat.
Seeing deeply: noticing that someone is turned away from the
camera, not just "a person standing."

Facts must be accurate. Interpretations should be bold.
You can be wrong about what something means.
You cannot be wrong about what's physically there.

Ask yourself: what makes THIS image different from every other
image of the same subject? If your observation could apply to
any photo of someone reading a book, you've failed. Start over.

Given an image, work through these observations:

1. DESCRIPTION — Report what's literally in the image. People,
objects, setting, text, colors, actions, spatial arrangement.
Plain and factual. Be thorough — if there's text visible,
read it. If someone's face is obscured, say how and by what.
If objects are worn or damaged, note it.

2. SUBJECT — What is HAPPENING in this image, in one line?
A headline, not an inventory. Capture the situation — who is
doing what, and what's the energy of the moment.

3. SPECIFIC DETAIL — The one detail you'd POINT OUT to someone
standing next to you. Not the obvious main subject — everyone
sees that already. The thing at the edge, the thing that's
slightly wrong, the thing that tells a story on its own.

4. TENSION — Name two specific VISIBLE things that pull against
each other. Not abstract categories — name the actual objects
or elements. Both must be visible in the image.

5. THE ABSENT — What's missing that SHOULD be here? What just
happened or is about to happen? Something specific to THIS
image, not something universally true of the subject.

6. LIGHT AND TIME — What does the light tell you? Not just
indoor or outdoor — what character does the light have?
What time of day does this feel like, and is this moment
a beginning, middle, or end of something?

7. GROUNDING DETAIL — One thing that triggers a sense OTHER
than sight. A sound you can almost hear. A texture you can
almost feel. A smell you can almost catch.

Here is the difference between a flat observation and a sharp one:

FLAT specific: "A dog sitting on the sidewalk"
SHARP specific: "A dog sitting exactly where the shade ends, nose in the sun, body in the cool"

FLAT tension: "Old and new things side by side"
SHARP tension: "A cracked concrete wall with a brand-new padlock on the gate"

FLAT absent: "Something happened before this moment"
SHARP absent: "Two glasses on the table, one still full"

Be the sharp version. Every time. The difference is precision —
the flat version names a category, the sharp version shows
the exact thing that makes THIS image different from every
other image of the same subject.

First, look at this image the way you'd actually look at it.
What grabs you? What's odd? What would you point out to a
friend — not describe, but POINT OUT? Think about this before
filling in the fields.

Then provide your observations as JSON in this exact format:
{
  "description": "...",
  "subject": "...",
  "specific": "...",
  "tension": "...",
  "absent": "...",
  "light_and_time": "...",
  "grounding_detail": "..."
}

Think first, then JSON. Nothing else after the JSON.`;

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function observeImage(imagePath) {
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

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.9,
    max_tokens: 800,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
  });

  const raw = completion.choices[0].message.content;
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');

  let observation;
  try {
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      throw new Error('No JSON object found in response');
    }
    observation = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  } catch (err) {
    console.error(`\nFailed to parse JSON for ${path.basename(resolvedPath)}. Raw response:\n`);
    console.error(raw);
    throw new Error(`Invalid JSON from model: ${err.message}`);
  }

  const outputsDir = path.join(__dirname, 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }

  const baseName = path.basename(resolvedPath, ext);
  const outputPath = path.join(outputsDir, `observe_${baseName}_${timestamp()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(observation, null, 2));

  return { observation, outputPath, imagePath: resolvedPath };
}

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Usage: node observe.js <path-to-image>');
    process.exit(1);
  }

  try {
    const { observation, outputPath } = await observeImage(imagePath);
    console.log(`\nObservation for ${path.basename(imagePath)}:\n`);
    console.log(JSON.stringify(observation, null, 2));
    console.log(`\nSaved to ${outputPath}`);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { observeImage };
