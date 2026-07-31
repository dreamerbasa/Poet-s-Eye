const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/caption', (req, res) => {
  const { image, character } = req.body;

  if (!image || !character) {
    return res.status(400).json({ error: 'image and character are required' });
  }

  res.json({
    caption: 'Okay so I just looked at this and honestly I have SO many thoughts right now dude',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
