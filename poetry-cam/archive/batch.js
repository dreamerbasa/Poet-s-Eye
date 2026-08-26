const fs = require('fs');
const path = require('path');
const { observeImage } = require('./observe');
const { runPipeline } = require('./run');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const TEST_IMAGES_DIR = path.join(__dirname, 'test-images');

function findTestImages() {
  if (!fs.existsSync(TEST_IMAGES_DIR)) {
    return [];
  }

  return fs.readdirSync(TEST_IMAGES_DIR)
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort()
    .map((file) => path.join(TEST_IMAGES_DIR, file));
}

async function main() {
  const withHaiku = process.argv.includes('--haiku');
  const imagePaths = findTestImages();

  if (imagePaths.length === 0) {
    console.log(`No images found in ${TEST_IMAGES_DIR}`);
    console.log('Add .jpg, .jpeg, .png, or .webp files there and try again.');
    return;
  }

  console.log(`Found ${imagePaths.length} image(s). Processing sequentially (${withHaiku ? 'observation + haiku' : 'observation only'})...\n`);

  const results = [];

  for (const imagePath of imagePaths) {
    const fileName = path.basename(imagePath);
    console.log('='.repeat(60));
    console.log(fileName);
    console.log('='.repeat(60));

    try {
      if (withHaiku) {
        await runPipeline(imagePath);
      } else {
        const { observation, outputPath } = await observeImage(imagePath);
        console.log(JSON.stringify(observation, null, 2));
        console.log(`\nSaved to ${outputPath}\n`);
      }
      results.push({ fileName, status: 'ok' });
    } catch (err) {
      console.error(`\nError processing ${fileName}: ${err.message}\n`);
      results.push({ fileName, status: 'error', error: err.message });
    }
  }

  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  for (const result of results) {
    console.log(`${result.status === 'ok' ? 'OK  ' : 'FAIL'}  ${result.fileName}`);
  }
}

main();
