import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.join(process.cwd(), 'reference', 'prototypes');
http.createServer((req, res) => {
  const file = path.join(root, path.basename(decodeURIComponent((req.url || '').split('?')[0])));
  fs.readFile(file, (err, data) => { res.writeHead(err ? 404 : 200, { 'content-type': 'text/html; charset=utf-8' }); res.end(err ? 'not found' : data); });
}).listen(3101, '127.0.0.1');
