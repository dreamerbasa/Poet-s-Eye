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

1. DESCRIPTION — Describe the image plainly and factually. What is literally visible — people, objects, setting, text, colors, actions. No interpretation, no poetry. A camera report, not a poet's take.

2. SUBJECT — What is this image OF, in one line? The main thing, not a detail within it. "A packed city bus at rush hour" not "a woman near the window." Establish the whole scene.

3. SPECIFIC DETAIL — Now zoom in. Within that scene, what one detail snags your attention? Not "a dog" but "a three-legged dog mid-stride chasing a chappal." Not "a cafe" but "a steel tumbler of filter coffee with foam still spinning."

4. TENSION — What two things in this image contrast or don't quite belong together? Old/new, still/moving, natural/artificial, big/small, sacred/mundane. There's always a tension — find it.

5. THE ABSENT — What's implied but not shown? What happened just before this moment? What's about to happen? What story does this image sit in the middle of?

6. LIGHT AND TIME — What moment is this? Time of day, season, quality of light. Is this a beginning or an ending? Morning energy or late-afternoon exhaustion?

7. GROUNDING DETAIL — One concrete sensory anchor. A color, a texture, a sound you can almost hear, a smell you can almost catch from looking at this image.

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

Use the record_observation tool to submit your observations.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'record_observation',
      description: 'Record structured poetic observations from an image',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: "Factual description of what's literally visible in the image",
          },
          subject: {
            type: 'string',
            description: 'The whole scene in one line',
          },
          specific: {
            type: 'string',
            description: 'One zoomed-in detail within the scene',
          },
          tension: {
            type: 'string',
            description: 'Two contrasting elements in the image',
          },
          absent: {
            type: 'string',
            description: "What's implied but not shown",
          },
          light_and_time: {
            type: 'string',
            description: 'Time of day, season, quality of light',
          },
          grounding_detail: {
            type: 'string',
            description: 'One concrete sensory anchor',
          },
        },
        required: ['description', 'subject', 'specific', 'tension', 'absent', 'light_and_time', 'grounding_detail'],
      },
    },
  },
];

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
    max_tokens: 500,
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
    tools: TOOLS,
    tool_choice: { type: 'function', function: { name: 'record_observation' } },
  });

  const toolCall = completion.choices[0].message.tool_calls?.[0];

  if (!toolCall) {
    const raw = completion.choices[0].message.content;
    console.error(`\nNo tool call returned for ${path.basename(resolvedPath)}. Raw response:\n`);
    console.error(raw);
    throw new Error('Model did not call record_observation');
  }

  let observation;
  try {
    observation = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    console.error(`\nFailed to parse tool call arguments for ${path.basename(resolvedPath)}. Raw arguments:\n`);
    console.error(toolCall.function.arguments);
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
