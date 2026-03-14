import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve everything from public/ — includes index.html, style.css,
// app.js, person.js, elevator.js
app.use(express.static(join(__dirname, '../public')));

// Fallback → index.html (for any unmatched routes)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Elevator sim running at http://localhost:${PORT}`);
});