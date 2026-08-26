require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const GENERATION_INSTRUCTION = `You will receive structured observations from an image. These are your raw material — NOT a checklist. A good haiku uses one or two of these observations, not all of them.

Your job:
1. Read all observations. Pick the one or two that have the most poetic potential — the sharpest tension, the most evocative detail, the most resonant absence.
2. Find the cut — two images to place side by side.
3. Write the haiku. 5-7-5 syllables, strictly counted.
4. Check your work against the spec. Does it moralize? Does it use banned words? Does the last line close a door or open one? Revise if needed.

Respond with ONLY the haiku. Three lines. Nothing else.`;

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
  lines.push("These examples show the RANGE of what good haiku looks like. Do not copy their content, structure, or imagery. Use them to calibrate your craft — learn the technique each one demonstrates, then generate something original.");
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

function buildSystemPrompt() {
  const specPath = path.join(__dirname, 'haiku-spec.md');
  const referencesPath = path.join(__dirname, 'haiku-references.json');

  const spec = readRequiredFile(specPath);
  const refsData = JSON.parse(readRequiredFile(referencesPath));
  const referencesSection = buildReferencesSection(refsData);

  return [spec.trim(), referencesSection, GENERATION_INSTRUCTION].join('\n\n');
}

function extractBaseName(observationFileName) {
  const withoutExt = observationFileName.replace(/\.json$/, '');
  const withoutPrefix = withoutExt.replace(/^observe_/, '');
  const lastUnderscore = withoutPrefix.lastIndexOf('_');
  return lastUnderscore === -1 ? withoutPrefix : withoutPrefix.slice(0, lastUnderscore);
}

async function generateHaikuFromObservation(observation, baseName) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Copy poetry-cam/.env.example to poetry-cam/.env and add your key.');
  }

  const systemPrompt = buildSystemPrompt();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.9,
    max_tokens: 150,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Image observations:\n\n${JSON.stringify(observation, null, 2)}` },
    ],
  });

  const haiku = completion.choices[0].message.content.trim();

  const outputsDir = path.join(__dirname, 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }

  const outputPath = path.join(outputsDir, `haiku_${baseName}_${timestamp()}.txt`);
  fs.writeFileSync(outputPath, haiku);

  return { haiku, outputPath };
}

async function generateHaiku(observationPath) {
  const resolvedPath = path.resolve(observationPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Observation file not found: ${resolvedPath}`);
  }

  const observation = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  const baseName = extractBaseName(path.basename(resolvedPath));

  return generateHaikuFromObservation(observation, baseName);
}

async function main() {
  const observationPath = process.argv[2];

  if (!observationPath) {
    console.error('Usage: node haiku.js <path-to-observation-json>');
    process.exit(1);
  }

  try {
    const { haiku, outputPath } = await generateHaiku(observationPath);
    console.log(`\n${haiku}\n`);
    console.log(`Saved to ${outputPath}`);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateHaikuFromObservation, generateHaiku, buildSystemPrompt };
