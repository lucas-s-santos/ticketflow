// Imagens para mostrar no celular durante a abertura do Reels: a tela da
// carteira com o QR do ingresso (o canhoto) e a home com o ingresso 3D, no
// tamanho de uma tela de iPhone. Salve no celular e abra em tela cheia.
//
//   npm run celular   → saida/celular-carteira.png e saida/celular-home.png
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { CHROME, RAIZ, SITE, entrar } from './lib/gravador.mjs';

const sessao = await entrar('marina@demo.com', 'demo123');
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await navegador.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument((s) => {
  localStorage.setItem('canhoto_token', s.token);
  localStorage.setItem('canhoto_user', JSON.stringify({ name: s.name, email: s.email, role: s.role }));
}, sessao);

// Carteira: o título da página e o ingresso da frente aberto, com o QR.
await page.goto(`${SITE}/reservations`, { waitUntil: 'networkidle0' });
await page.waitForSelector('[data-frente] qrcode svg');
await page.evaluate(() => window.scrollTo(0, document.querySelector('h1').getBoundingClientRect().top + scrollY - 100));
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: path.join(RAIZ, 'saida', 'celular-carteira.png') });

// Home: o ingresso 3D já pousado no palco escuro.
await page.goto(`${SITE}/`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3500));
await page.screenshot({ path: path.join(RAIZ, 'saida', 'celular-home.png') });

await navegador.close();
console.log('  saida/celular-carteira.png e saida/celular-home.png (1170×2532)');
