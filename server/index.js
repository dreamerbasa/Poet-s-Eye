const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { generateHaiku } = require('./haiku');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/haiku', (req, res, next) => {
  req.setTimeout(60000);
  res.setTimeout(60000);
  next();
}, async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Missing image' });
  }

  try {
    const result = await generateHaiku(image);
    res.json(result);
  } catch (err) {
    console.error('Haiku generation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate haiku. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
