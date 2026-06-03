// ─────────────────────────────────────────────
//  PropuestaIA — Servidor proxy seguro
//  Requisitos: Node.js 18+
//  Instalar:   npm install
//  Arrancar:   node server.js
// ─────────────────────────────────────────────

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

// ── Configura tu API key aquí ─────────────────
// Opción 1: variable de entorno (recomendado)
//   export ANTHROPIC_API_KEY=sk-ant-...
// Opción 2: escríbela directamente (solo para pruebas locales)
const API_KEY = process.env.ANTHROPIC_API_KEY || 'PON-AQUI-TU-API-KEY';
const PORT    = process.env.PORT || 3000;

// ── Tipos MIME ────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

// ── Servidor HTTP ─────────────────────────────
const server = http.createServer(async (req, res) => {

  // CORS — permite llamadas desde el navegador
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const parsedUrl = url.parse(req.url);

  // ── POST /api/generate — llama a Anthropic ──
  if (req.method === 'POST' && parsedUrl.pathname === '/api/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt } = JSON.parse(body);

        // Llamada a la API de Anthropic desde el servidor (seguro)
        const anthropicBody = JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages:   [{ role: 'user', content: prompt }]
        });

        const options = {
          hostname: 'api.anthropic.com',
          port:     443,
          path:     '/v1/messages',
          method:   'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Length':    Buffer.byteLength(anthropicBody)
          }
        };

        const apiReq = https.request(options, apiRes => {
          let data = '';
          apiRes.on('data', chunk => data += chunk);
          apiRes.on('end', () => {
            res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(data);
          });
        });

        apiReq.on('error', err => {
          console.error('Error API:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Error conectando con la IA' }));
        });

        apiReq.write(anthropicBody);
        apiReq.end();

      } catch (e) {
        console.error('Error:', e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Petición inválida' }));
      }
    });
    return;
  }

  // ── GET /* — sirve archivos estáticos ────────
  let filePath = path.join(__dirname, 'public',
    parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname
  );

  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Archivo no encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
  ✦ PropuestaIA arrancado
  ─────────────────────────────────
  Local:   http://localhost:${PORT}
  API Key: ${API_KEY.startsWith('sk-') ? '✓ Configurada' : '✗ FALTA — añade tu clave en server.js'}
  ─────────────────────────────────
  `);
});
