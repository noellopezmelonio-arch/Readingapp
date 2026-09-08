const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const dbPath = path.join(__dirname, 'data', 'db.json');

function readDB() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], books: [] };
  }
}

function writeDB(obj) {
  fs.writeFileSync(dbPath, JSON.stringify(obj, null, 2), 'utf8');
}

function sendJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  console.log(`[server] ${req.method} ${pathname}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (pathname === '/api/ping' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === '/api/sync' && req.method === 'GET') {
    const db = readDB();
    const last = (db.sync && db.sync.lastSync) || 0;
    return sendJSON(res, 200, { lastSync: last });
  }

  if (pathname === '/api/sync' && req.method === 'POST') {
    const db = readDB();
    db.sync = db.sync || {};
    db.sync.lastSync = Date.now();
    writeDB(db);
    return sendJSON(res, 200, { lastSync: db.sync.lastSync });
  }

  if (pathname === '/api/users' && req.method === 'GET') {
    const db = readDB();
    const users = (db.users || []).map(u => ({ id: u.id, name: u.name, email: u.email }));
    return sendJSON(res, 200, users);
  }

  if (pathname === '/api/auth' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = readDB();
    const user = (db.users || []).find(u => u.email === String(body.email) && u.password === String(body.password));
    if (!user) return sendJSON(res, 401, { error: 'Invalid credentials' });
    const out = Object.assign({}, user);
    delete out.password;
    return sendJSON(res, 200, out);
  }

  if (pathname === '/api/books' && req.method === 'GET') {
    const db = readDB();
    return sendJSON(res, 200, db.books || []);
  }

  if (pathname === '/api/books' && req.method === 'POST') {
    const body = await parseBody(req);
    const db = readDB();
    db.books = db.books || [];
    // if body contains id and it already exists, update instead
    if (body && body.id) {
      const existing = db.books.find(b => String(b.id) === String(body.id));
      if (existing) {
        const idx = db.books.findIndex(b => String(b.id) === String(body.id));
        db.books[idx] = Object.assign({}, db.books[idx], body, { updatedAt: Date.now() });
        writeDB(db);
        return sendJSON(res, 200, db.books[idx]);
      }
    }
    const id = body && body.id ? body.id : (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
    const newBook = Object.assign({ id, updatedAt: Date.now() }, body);
    db.books.push(newBook);
    writeDB(db);
    return sendJSON(res, 201, newBook);
  }

  const bookIdMatch = pathname.match(/^\/api\/books\/(.+)$/);
  if (bookIdMatch) {
    const id = decodeURIComponent(bookIdMatch[1]);
    const db = readDB();
    const bookIndex = (db.books || []).findIndex(b => String(b.id) === String(id));

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (bookIndex === -1) return sendJSON(res, 404, { error: 'Not found' });
      db.books[bookIndex] = Object.assign({}, db.books[bookIndex], body, { updatedAt: Date.now() });
      writeDB(db);
      return sendJSON(res, 200, db.books[bookIndex]);
    }

    if (req.method === 'DELETE') {
      if (bookIndex === -1) return sendJSON(res, 404, { error: 'Not found' });
      const removed = db.books.splice(bookIndex, 1)[0];
      writeDB(db);
      return sendJSON(res, 200, removed);
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Minimal persistence server listening on http://localhost:${PORT}`);
});
