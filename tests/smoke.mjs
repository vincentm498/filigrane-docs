// Test de fumée : ouvre la page dans un vrai navigateur et vérifie le parcours principal.
// Usage : npm test   (PLAYWRIGHT_CHANNEL=chrome pour utiliser le Chrome installé)
import { chromium } from 'playwright';
import { demarrer } from './serveur.mjs';

const { origine, fermer } = await demarrer();

let echecs = 0;
const verifier = (condition, message) => {
  console.log(`${condition ? 'OK   ' : 'ÉCHEC'} ${message}`);
  if (!condition) echecs++;
};

const navigateur = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await navigateur.newPage({ acceptDownloads: true });
  const erreurs = [];
  const externes = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(origine) && !u.startsWith('blob:') && !u.startsWith('data:')) externes.push(u);
  });

  await page.goto(origine);

  // fichiers de test fabriqués dans la page : deux images de même nom et un PDF de 2 pages
  const fichiers = await page.evaluate(async () => {
    const png = async (texte) => {
      const c = document.createElement('canvas');
      c.width = 800; c.height = 500;
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 800, 500);
      x.fillStyle = '#000'; x.font = '48px Arial'; x.fillText(texte, 40, 120);
      return c.toDataURL('image/png').split(',')[1];
    };
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.text('Page 1', 20, 30); pdf.addPage(); pdf.text('Page 2', 20, 30);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(pdf.output('arraybuffer'))));
    return { a: await png('A'), b: await png('B'), pdf: b64 };
  });
  await page.setInputFiles('#entree', [
    { name: 'carte.png', mimeType: 'image/png', buffer: Buffer.from(fichiers.a, 'base64') },
    { name: 'carte.png', mimeType: 'image/png', buffer: Buffer.from(fichiers.b, 'base64') },
    { name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from(fichiers.pdf, 'base64') },
  ]);
  await page.waitForFunction(() => document.querySelectorAll('#fichiers li').length === 3);
  verifier(true, 'trois fichiers chargés (dont un PDF de 2 pages)');
  verifier(await page.locator('#barre-tout').isHidden(), '« Tout télécharger » caché avant génération');
  await page.waitForSelector('#scene:not([hidden])');
  verifier(await page.locator('#barre-pages').isHidden(), 'pas de navigation de pages pour une image seule');

  // navigation entre les pages du PDF
  await page.click('#fichiers li:nth-child(3)');
  await page.waitForSelector('#barre-pages:not([hidden])');
  verifier((await page.textContent('#page-num')) === 'Page 1 / 2', 'aperçu : « Page 1 / 2 »');
  await page.click('#page-suiv');
  verifier((await page.textContent('#page-num')) === 'Page 2 / 2', 'navigation vers la page 2');

  // rotation de l'image
  await page.click('#rot-d');
  verifier((await page.inputValue('#angle-img')) === '90', 'rotation de 90°');
  await page.click('#rot-0');

  // une zone masquée tracée à la souris
  await page.click('#fichiers li:nth-child(1)');
  await page.waitForSelector('#scene:not([hidden])');
  await page.waitForTimeout(300); // l'aperçu est redessiné avec un léger délai
  const scene = await page.locator('#scene').boundingBox();
  await page.mouse.move(scene.x + 40, scene.y + 40);
  await page.mouse.down();
  await page.mouse.move(scene.x + 200, scene.y + 90, { steps: 5 });
  await page.mouse.up();
  verifier((await page.textContent('#nb-masques')).includes('1 zone'), 'zone de masquage tracée');

  // génération en JPG : noms uniques
  await page.fill('#destinataire', 'Test');
  await page.fill('#motif', 'essai');
  await page.selectOption('#format', 'jpg');
  await page.click('#generer');
  await page.waitForSelector('#resultats li');
  await page.waitForFunction(() => !document.querySelector('#generer').disabled);
  const noms = await page.$$eval('#resultats a', (liens) => liens.map((a) => a.download));
  verifier(noms.length === 4, `4 fichiers générés (${noms.join(', ')})`);
  verifier(new Set(noms).size === noms.length, 'aucun nom en double');
  verifier(noms.includes('carte_protege.jpg') && noms.includes('carte_protege (2).jpg'), 'doublons renommés');

  // téléchargement groupé en ZIP
  const [zip] = await Promise.all([page.waitForEvent('download'), page.click('#tout')]);
  verifier(zip.suggestedFilename() === 'documents_proteges.zip', 'ZIP téléchargé');

  // génération en PDF
  await page.selectOption('#format', 'pdf');
  await page.click('#generer');
  await page.waitForFunction(() => !document.querySelector('#generer').disabled);
  const pdfs = await page.$$eval('#resultats a', (liens) => liens.map((a) => a.download));
  verifier(pdfs.length === 3 && pdfs.every((n) => n.endsWith('.pdf')), 'sortie PDF');

  verifier(erreurs.length === 0, `aucune erreur dans la console${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
  verifier(externes.length === 0, `aucune requête vers l'extérieur${externes.length ? ' : ' + externes.join(', ') : ''}`);
} catch (e) {
  console.error(e);
  echecs++;
} finally {
  await navigateur.close();
  fermer();
}
process.exit(echecs ? 1 : 0);
