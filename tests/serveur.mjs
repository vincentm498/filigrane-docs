// Serveur statique minimal, limité au dossier du projet, partagé par les scripts de test.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.md': 'text/plain' };

export async function demarrer() {
  const serveur = createServer(async (req, res) => {
    try {
      const chemin = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
      const fichier = join(RACINE, chemin === '/' ? 'index.html' : chemin);
      if (!fichier.startsWith(RACINE)) throw new Error('hors du projet');
      const contenu = await readFile(fichier);
      res.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
      res.end(contenu);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  return { origine: `http://127.0.0.1:${serveur.address().port}`, fermer: () => serveur.close() };
}
