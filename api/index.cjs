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

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = status;
  res.end(body);
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

module.exports = async function handler(req, res) {
  const url    = req.url.replace(/\?.*$/, '');
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (method === 'GET' && url === '/api/state')
    return send(res, 200, state);

  if (method === 'GET' && url === '/api/requests')
    return send(res, 200, state.requests);

  if (method === 'POST' && url === '/api/requests') {
    const body = await readBody(req);
    const { name, currentFloor, dropOffFloor, color } = body;
    if (currentFloor === undefined || dropOffFloor === undefined)
      return send(res, 400, { error: 'currentFloor and dropOffFloor are required' });
    if (Number(currentFloor) === Number(dropOffFloor))
      return send(res, 400, { error: 'currentFloor and dropOffFloor must differ' });
    const person = {
      id: nextId++,
      name: name || 'Anonymous',
      currentFloor: Number(currentFloor),
      dropOffFloor: Number(dropOffFloor),
      color: color || '#ffffff',
    };
    state.requests.push(person);
    return send(res, 201, person);
  }

  const reqDeleteMatch = url.match(/^\/api\/requests\/(\d+)$/);
  if (method === 'DELETE' && reqDeleteMatch) {
    const id  = Number(reqDeleteMatch[1]);
    const idx = state.requests.findIndex(p => p.id === id);
    if (idx === -1) return send(res, 404, { error: 'Request not found' });
    return send(res, 200, state.requests.splice(idx, 1)[0]);
  }

  if (method === 'GET' && url === '/api/riders')
    return send(res, 200, state.riders);

  if (method === 'POST' && url === '/api/riders') {
    const body = await readBody(req);
    const { personId } = body;
    const idx = state.requests.findIndex(p => p.id === personId);
    if (idx === -1) return send(res, 404, { error: 'Person not found in requests' });
    const [person] = state.requests.splice(idx, 1);
    state.riders.push(person);
    state.stops++;
    return send(res, 201, person);
  }

  const riderDeleteMatch = url.match(/^\/api\/riders\/(\d+)$/);
  if (method === 'DELETE' && riderDeleteMatch) {
    const id  = Number(riderDeleteMatch[1]);
    const idx = state.riders.findIndex(r => r.id === id);
    if (idx === -1) return send(res, 404, { error: 'Rider not found' });
    const [removed] = state.riders.splice(idx, 1);
    state.stops++;
    return send(res, 200, removed);
  }

  if (method === 'PATCH' && url === '/api/elevator') {
    const body = await readBody(req);
    if (body.currentFloor    !== undefined) state.currentFloor    = Number(body.currentFloor);
    if (body.floorsTraversed !== undefined) state.floorsTraversed = Number(body.floorsTraversed);
    return send(res, 200, state);
  }

  if (method === 'POST' && url === '/api/reset') {
    resetState();
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: 'Not found' });
};
