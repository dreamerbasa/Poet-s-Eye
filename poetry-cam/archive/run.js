require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { observeImage } = require('./observe');
const { generateHaikuFromObservation } = require('./haiku');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function runPipeline(imagePath) {
  const { observation, imagePath: resolvedImagePath } = await observeImage(imagePath);

  console.log('=== OBSERVATION ===\n');
  console.log(JSON.stringify(observation, null, 2));

  const baseName = path.basename(resolvedImagePath, path.extname(resolvedImagePath));
  const { haiku } = await generateHaikuFromObservation(observation, baseName);

  console.log('\n=== HAIKU ===\n');
  console.log(haiku);

  const outputsDir = path.join(__dirname, 'outputs');
  if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
  }

  const combined = {
    image: path.basename(resolvedImagePath),
    observation,
    haiku,
    timestamp: new Date().toISOString(),
  };
  const combinedPath = path.join(outputsDir, `combined_${baseName}_${timestamp()}.json`);
  fs.writeFileSync(combinedPath, JSON.stringify(combined, null, 2));

  console.log(`\nSaved combined output to ${combinedPath}`);

  return { observation, haiku, combinedPath };
}

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Usage: node run.js <path-to-image>');
    process.exit(1);
  }

  try {
    await runPipeline(imagePath);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runPipeline };
