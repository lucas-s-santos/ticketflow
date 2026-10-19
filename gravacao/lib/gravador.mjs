// Gravador quadro a quadro: dirige o site com o Puppeteer, avança o relógio
// virtual da página (ver palco.js) exatamente 1/fps por quadro, tira um print de
// cada quadro e no fim junta tudo num MP4 com o ffmpeg.
import puppeteer from 'puppeteer-core';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, '..');
export const SITE = process.env.SITE ?? 'http://localhost:4200';
export const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** Curva de rolagem: começa e termina devagar, como um dedo (ou uma roda) de verdade. */
export const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const mix = (a, b, t) => a + (b - a) * t;

/**
 * @param {object} o
 * @param {string} o.nome        prefixo dos arquivos (quadros e vídeo)
 * @param {number} o.largura     viewport em px CSS
 * @param {number} o.altura
 * @param {number} o.dpr         densidade: viewport × dpr = resolução da gravação
 * @param {boolean} o.celular    emula toque e layout de celular
 * @param {object} [o.sessao]    resposta do /auth/login, injetada no localStorage
 */
export async function iniciar({ nome, largura, altura, dpr, celular, sessao, fps = 30 }) {
  const navegador = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    // Sem os flags de renderização por software: o Chrome usa a placa de vídeo.
    args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await navegador.newPage();
  await page.setViewport({ width: largura, height: altura, deviceScaleFactor: dpr, isMobile: celular, hasTouch: celular });
  await page.evaluateOnNewDocument(await readFile(path.join(AQUI, 'palco.js'), 'utf8'));
  // A sessão entra no localStorage antes do app subir, em toda página aberta.
  let scriptSessao = null;
  async function usarSessao(s) {
    if (scriptSessao) await page.removeScriptToEvaluateOnNewDocument(scriptSessao);
    scriptSessao = s
      ? (await page.evaluateOnNewDocument((x) => {
        localStorage.setItem('canhoto_token', x.token);
        localStorage.setItem('canhoto_user', JSON.stringify({ name: x.name, email: x.email, role: x.role }));
      }, s)).identifier
      : null;
  }
  await usarSessao(sessao);
  page.on('pageerror', (e) => console.warn(`  [erro na página] ${e.message}`));

  const pasta = path.join(RAIZ, 'saida', `quadros-${nome}`);
  await rm(pasta, { recursive: true, force: true });
  await mkdir(pasta, { recursive: true });

  const passo = 1000 / fps;
  let contador = 0;
  const inicio = Date.now();
  // Onde o mouse está (desktop): os movimentos partem daqui.
  let mouse = { x: largura * 0.62, y: altura * 0.72 };

  /** Faz o tempo da página andar (sem gravar) até a condição ser verdadeira. */
  async function bombear(pronto, limiteSeg = 60) {
    const t0 = Date.now();
    for (;;) {
      if (await page.evaluate(pronto)) return;
      await page.evaluate((ms) => window.__gravacao.avancar(ms), passo);
      await new Promise((r) => setTimeout(r, passo));
      if (Date.now() - t0 > limiteSeg * 1000) throw new Error(`a página não ficou pronta: ${pronto}`);
    }
  }

  async function centro(seletor) {
    return page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) throw new Error(`não achei ${s}`);
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, seletor);
  }

  async function moverMouse(x, y) {
    mouse = { x, y };
    await page.mouse.move(x, y);
    await page.evaluate((a, b) => window.__gravacao.ponteiro(a, b), x, y);
  }

  const g = {
    page,
    fps,

    /** Segundos de vídeo já gravados: marca onde cada legenda começa e termina. */
    tempo: () => contador / fps,

    /** Abre uma rota e deixa o tempo correr até `pronto()` (função avaliada na página). */
    async abrir(rota, pronto) {
      await page.goto(SITE + rota, { waitUntil: 'domcontentloaded' });
      if (!celular) await page.evaluate((a, b) => window.__gravacao.ponteiro(a, b), mouse.x, mouse.y);
      await bombear(pronto);
    },

    /** Deixa o tempo correr sem gravar (ex.: esperar a API depois de um clique). */
    esperar: bombear,

    /** Troca a conta logada; vale a partir da próxima página aberta com abrir(). */
    trocarSessao: usarSessao,

    /** Um quadro: posiciona a rolagem (opcional), avança o relógio e fotografa. */
    async quadro(y) {
      await page.evaluate(([yy, ms]) => {
        if (yy !== null) window.__gravacao.rolar(yy);
        return window.__gravacao.avancar(ms);
      }, [y ?? null, passo]);
      const imagem = await page.screenshot({ type: 'jpeg', quality: 92, optimizeForSpeed: true });
      await writeFile(path.join(pasta, `${String(contador++).padStart(5, '0')}.jpg`), imagem);
      if (contador % fps === 0) process.stdout.write(`\r  ${nome}: ${contador / fps}s gravados`);
    },

    /** Grava `segundos`; `rolagem(p)` devolve a posição da página para p de 0 a 1. */
    async durante(segundos, rolagem) {
      const total = Math.max(1, Math.round(segundos * fps));
      for (let i = 0; i < total; i++) {
        await g.quadro(rolagem ? Math.round(rolagem(total > 1 ? i / (total - 1) : 1)) : null);
      }
    },

    /**
     * Grava até a condição valer (ex.: a resposta da API aparecer na tela). Sem
     * corte: durante a gravação o relógio da página anda mais devagar que o
     * real, então o servidor costuma responder em um ou dois quadros.
     */
    async gravarAte(pronto, limiteSeg = 8) {
      for (let i = 0; i < limiteSeg * fps; i++) {
        if (await page.evaluate(pronto)) return;
        await g.quadro();
      }
      throw new Error(`não aconteceu em ${limiteSeg} s de vídeo: ${pronto}`);
    },

    /** Rola da posição atual até `y`, gravando, com a curva suave. */
    async rolarAte(y, segundos) {
      const de = await page.evaluate(() => window.scrollY);
      await g.durante(segundos, (p) => mix(de, y, suave(p)));
    },

    /** Posição de documento (rolagem) de um elemento: topo, centro ou base. */
    async posicao(seletor, ponto = 'topo') {
      return page.evaluate((s, p) => {
        const el = document.querySelector(s);
        if (!el) throw new Error(`não achei ${s}`);
        const r = el.getBoundingClientRect();
        const y = r.top + window.scrollY;
        return p === 'topo' ? y : p === 'centro' ? y + r.height / 2 : y + r.height;
      }, seletor, ponto);
    },

    async medida(js) { return page.evaluate(js); },

    /**
     * Acha um elemento pelo texto visível (exato ou, na falta, contido) e o
     * marca para os comandos seguintes. Devolve o seletor da marca.
     */
    async marcar(nome, seletor, texto) {
      await page.evaluate((n, s, t) => {
        const todos = [...document.querySelectorAll(s)];
        const el = todos.find((e) => e.textContent.trim() === t) ?? todos.find((e) => e.textContent.includes(t));
        if (!el) throw new Error(`não achei ${s} com "${t}"`);
        document.querySelectorAll(`[data-gravacao="${n}"]`).forEach((e) => e.removeAttribute('data-gravacao'));
        el.setAttribute('data-gravacao', n);
      }, nome, seletor, texto);
      return `[data-gravacao="${nome}"]`;
    },

    escurecer(de, para, segundos) {
      return page.evaluate((a, b, ms) => window.__gravacao.escurecer(a, b, ms), de, para, segundos * 1000);
    },

    /** Toca (celular) ou clica (desktop) no centro de um elemento, com o círculo do toque. */
    async tocar(seletor) {
      const { x, y } = await centro(seletor);
      await page.evaluate((a, b) => window.__gravacao.toque(a, b), x, y);
      if (celular) await page.touchscreen.tap(x, y);
      else {
        await moverMouse(x, y);
        await page.mouse.down();
        await g.quadro();
        await g.quadro();
        await page.mouse.up();
      }
    },

    /** Leva o mouse até o centro de um elemento, gravando o caminho (desktop). */
    async passarMouse(seletor, segundos, { dx = 0, dy = 0 } = {}) {
      const alvo = await centro(seletor);
      const de = { ...mouse };
      const total = Math.max(1, Math.round(segundos * fps));
      for (let i = 1; i <= total; i++) {
        const p = suave(i / total);
        await moverMouse(mix(de.x, alvo.x + dx, p), mix(de.y, alvo.y + dy, p));
        await g.quadro();
      }
    },

    /** Segura o botão do mouse onde ele está e arrasta (dx, dy), gravando (desktop). */
    async arrastarMouse(dx, dy, segundos) {
      const de = { ...mouse };
      await page.mouse.down();
      const total = Math.max(2, Math.round(segundos * fps));
      for (let i = 1; i <= total; i++) {
        const p = suave(i / total);
        await moverMouse(de.x + dx * p, de.y + dy * p);
        await g.quadro();
      }
      await page.mouse.up();
    },

    /** Preenche um campo de uma vez, como quem cola o texto. */
    async colar(seletor, texto) {
      await page.focus(seletor);
      await page.evaluate((s) => { document.querySelector(s).value = ''; }, seletor);
      await page.keyboard.sendCharacter(texto);
    },

    /** Arrasta com o dedo sobre um elemento por `dx` px, gravando cada quadro. */
    async arrastar(seletor, dx, segundos) {
      const { x, y } = await page.evaluate((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + Math.min(70, r.height / 2) };
      }, seletor);
      await page.evaluate((a, b) => window.__gravacao.toque(a, b), x, y);
      await page.touchscreen.touchStart(x, y);
      const total = Math.max(2, Math.round(segundos * fps));
      for (let i = 1; i <= total; i++) {
        await page.touchscreen.touchMove(x + dx * suave(i / total), y + i * 0.4);
        await g.quadro();
      }
      await page.touchscreen.touchEnd();
    },

    async fechar() {
      await navegador.close();
      process.stdout.write('\n');
    },

    /**
     * Junta os quadros num MP4 H.264 com faixa de áudio muda (algumas redes
     * recusam vídeo sem áudio). As cenas (trechos de cada legenda) vão num JSON
     * ao lado, para a montagem poder ser refeita sem gravar de novo.
     */
    async montar(arquivo, cenas = []) {
      const destino = path.join(RAIZ, 'saida', arquivo);
      await writeFile(destino.replace(/\.mp4$/, '.cenas.json'), JSON.stringify(cenas, null, 2));
      await ffmpeg([
        '-y', '-v', 'error',
        '-framerate', String(fps), '-i', path.join(pasta, '%05d.jpg'),
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-shortest',
        '-vf', `scale=${Math.round(largura * dpr / 2) * 2}:${Math.round(altura * dpr / 2) * 2}:flags=lanczos,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-r', String(fps),
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        destino,
      ]);
      const minutos = ((Date.now() - inicio) / 60000).toFixed(1);
      console.log(`  site gravado: saida/${arquivo} (${contador} quadros, ${(contador / fps).toFixed(1)} s, ${minutos} min de gravação)`);
      return destino;
    },
  };
  return g;
}

export function ffmpeg(args) {
  return new Promise((ok, falha) => {
    const p = spawn(process.env.FFMPEG ?? 'ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', falha);
    p.on('exit', (codigo) => (codigo === 0 ? ok() : falha(new Error(`ffmpeg saiu com código ${codigo}`))));
  });
}

/**
 * Cancela as reservas que ficaram esperando pagamento (de uma gravação que
 * parou no meio): elas apareceriam em "Aguardando pagamento" no topo da carteira.
 */
export async function limparPendentes(sessao) {
  const api = process.env.API ?? 'http://localhost:8080/api';
  const auth = { Authorization: `Bearer ${sessao.token}` };
  const reservas = await (await fetch(`${api}/reservations/me`, { headers: auth })).json();
  for (const r of reservas.filter((x) => x.status === 'PENDING')) {
    const resposta = await fetch(`${api}/reservations/${r.id}`, { method: 'DELETE', headers: auth });
    console.log(`  reserva pendente cancelada: ${r.eventName} (HTTP ${resposta.status})`);
  }
}

/** Login pela API (uma vez por gravação: o app limita tentativas por minuto). */
export async function entrar(email, senha) {
  const api = process.env.API ?? 'http://localhost:8080/api';
  const r = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  if (!r.ok) throw new Error(`login de ${email} falhou: HTTP ${r.status}`);
  return r.json();
}
