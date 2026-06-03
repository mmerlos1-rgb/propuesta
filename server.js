const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const API_KEY = process.env.ANTHROPIC_API_KEY || 'PON-AQUI-TU-API-KEY';
const PORT    = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const parsedUrl = url.parse(req.url);

  // POST /api/generate
  if (req.method === 'POST' && parsedUrl.pathname === '/api/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prompt } = JSON.parse(body);

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
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Error conectando con la IA' }));
        });

        apiReq.write(anthropicBody);
        apiReq.end();

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Peticion invalida' }));
      }
    });
    return;
  }

  // Servir index.html para cualquier ruta
  const indexPath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(indexPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No se encontro index.html en la carpeta public/');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
  PropuestaIA arrancado
  Local:   http://localhost:${PORT}
  API Key: ${API_KEY.startsWith('sk-') ? 'OK - Configurada' : 'FALTA - añade tu clave'}
  `);
});
