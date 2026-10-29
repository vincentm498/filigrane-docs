// Génère docs/apercu.png : capture de la page avec un document fictif (aucune donnée réelle).
// Usage : node tests/capture.mjs   (PLAYWRIGHT_CHANNEL=chrome pour utiliser le Chrome installé)
import { chromium } from 'playwright';
import { demarrer } from './serveur.mjs';

const { origine, fermer } = await demarrer();
const navigateur = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 860 }, colorScheme: 'light' });
  await page.goto(origine);

  // carte fictive dessinée dans la page
  const carte = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 760;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f6fb'; x.fillRect(0, 0, 1200, 760);
    x.fillStyle = '#2b59c3'; x.fillRect(0, 0, 1200, 110);
    x.fillStyle = '#fff'; x.font = 'bold 48px Arial'; x.fillText('CARTE D’EXEMPLE', 50, 72);
    x.fillStyle = '#d9dde5'; x.fillRect(60, 160, 260, 330);
    x.fillStyle = '#9aa3b2'; x.beginPath(); x.arc(190, 280, 55, 0, 7); x.fill(); x.fillRect(110, 350, 160, 140);
    x.fillStyle = '#1d2330'; x.font = '46px Arial';
    ['Nom : EXEMPLE', 'Prénom : Jeanne', 'Né(e) le : 01/01/1990', 'N° : 000000EX0000'].forEach((t, i) => x.fillText(t, 380, 230 + i * 90));
    x.fillStyle = '#1d2330';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if ((i * 7 + j * 3 + i * j) % 3 === 0) x.fillRect(930 + i * 24, 140 + j * 24, 22, 22);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.setInputFiles('#entree', [{ name: 'carte-exemple.png', mimeType: 'image/png', buffer: Buffer.from(carte, 'base64') }]);
  await page.fill('#destinataire', 'Poney club des Ulis');
  await page.fill('#motif', 'publication sur le site web');
  await page.waitForSelector('#scene:not([hidden])');
  await page.waitForTimeout(400);

  // une zone sur le QR code, légèrement tournée
  const s = await page.locator('#scene').boundingBox();
  await page.mouse.move(s.x + s.width * 0.74, s.y + s.height * 0.15);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width * 0.97, s.y + s.height * 0.51, { steps: 6 });
  await page.mouse.up();
  await page.fill('#angle-zone', '-6');
  await page.waitForTimeout(400);

  await page.screenshot({ path: new URL('../docs/apercu.png', import.meta.url).pathname });
  console.log('docs/apercu.png écrit');
} finally {
  await navigateur.close();
  fermer();
}
