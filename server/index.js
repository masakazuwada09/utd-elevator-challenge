import express    from 'express';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// ── IN-MEMORY STATE (Level 9: all mutations go through API) ──────────────
let state = {
  currentFloor:    0,
  requests:        [],
  riders:          [],
  floorsTraversed: 0,
  stops:           0,
};
let nextId = 1;

function resetState() {
  state = { currentFloor: 0, requests: [], riders: [], floorsTraversed: 0, stops: 0 };
  nextId = 1;
}

// ── GET /api/state ────────────────────────────────────────────────────────
app.get('/api/state', (req, res) => res.json(state));

// ── POST /api/requests  — add pickup request ──────────────────────────────
app.post('/api/requests', (req, res) => {
  const { name, currentFloor, dropOffFloor, color } = req.body;
  if (currentFloor === undefined || dropOffFloor === undefined)
    return res.status(400).json({ error: 'currentFloor and dropOffFloor are required' });
  if (Number(currentFloor) === Number(dropOffFloor))
    return res.status(400).json({ error: 'currentFloor and dropOffFloor must differ' });

  const person = {
    id: nextId++,
    name: name || 'Anonymous',
    currentFloor: Number(currentFloor),
    dropOffFloor: Number(dropOffFloor),
    color: color || '#ffffff',
  };
  state.requests.push(person);
  res.status(201).json(person);
});

// ── GET /api/requests ─────────────────────────────────────────────────────
app.get('/api/requests', (req, res) => res.json(state.requests));

// ── DELETE /api/requests/:id  — cancel a request ─────────────────────────
app.delete('/api/requests/:id', (req, res) => {
  const idx = state.requests.findIndex(p => p.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });
  res.json(state.requests.splice(idx, 1)[0]);
});

// ── POST /api/riders  — pickup: move request → rider ─────────────────────
app.post('/api/riders', (req, res) => {
  const { personId } = req.body;
  const idx = state.requests.findIndex(p => p.id === personId);
  if (idx === -1) return res.status(404).json({ error: 'Person not found in requests' });
  const [person] = state.requests.splice(idx, 1);
  state.riders.push(person);
  state.stops++;
  res.status(201).json(person);
});

// ── GET /api/riders ───────────────────────────────────────────────────────
app.get('/api/riders', (req, res) => res.json(state.riders));

// ── DELETE /api/riders/:id  — drop off a rider ───────────────────────────
app.delete('/api/riders/:id', (req, res) => {
  const idx = state.riders.findIndex(r => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Rider not found' });
  const [removed] = state.riders.splice(idx, 1);
  state.stops++;
  res.json(removed);
});

// ── PATCH /api/elevator  — update floor / stats ───────────────────────────
app.patch('/api/elevator', (req, res) => {
  const { currentFloor, floorsTraversed } = req.body;
  if (currentFloor    !== undefined) state.currentFloor    = Number(currentFloor);
  if (floorsTraversed !== undefined) state.floorsTraversed = Number(floorsTraversed);
  res.json(state);
});

// ── POST /api/reset ───────────────────────────────────────────────────────
app.post('/api/reset', (req, res) => { resetState(); res.json({ ok: true }); });

app.listen(PORT, () => console.log(`Elevator sim → http://localhost:${PORT}`));