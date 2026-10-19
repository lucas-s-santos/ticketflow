// Pós-produção do vídeo do LinkedIn: põe a gravação do site numa janela de
// cantos arredondados sobre o palco escuro da marca, escreve as legendas embaixo
// — fora do site, para nunca cobrir o que importa — e fecha com a cartela final.
// (O Reels tem o formato próprio do Lucas, em reels.mjs.) As artes (fundo,
// legendas, cartela) são HTML renderizado pelo Chrome com as fontes do site; o
// ffmpeg só compõe as camadas.
import puppeteer from 'puppeteer-core';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { CHROME, RAIZ, ffmpeg } from './gravador.mjs';

/** Medidas em px do vídeo final: a tela no alto, a legenda numa linha embaixo. */
export const FORMATOS = {
  horizontal: {
    largura: 1920, altura: 1080,
    tela: { x: 224, y: 44, largura: 1472, altura: 828, raio: 16 },
    legenda: { x: 224, largura: 1472, topo: 902, rotulo: 20, texto: 46 },
  },
};

const FONTES = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&family=Fraunces:opsz,wght@9..144,600&family=Space+Mono:wght@700&display=swap';

/**
 * @param {object} o
 * @param {'horizontal'} o.formato
 * @param {string} o.gravacao       MP4 do site (saída de g.montar)
 * @param {Array<{texto:string, rotulo?:string, de:number, ate:number}>} o.legendas  em segundos de vídeo
 * @param {{titulo:string, linhas:string[]}} o.cartela   tela final
 * @param {string} o.arquivo         nome do MP4 final em saida/
 */
export async function montar({ formato, gravacao, legendas, cartela, arquivo, segundosCartela = 3.5 }) {
  const f = FORMATOS[formato];
  const pasta = path.join(RAIZ, 'saida', `artes-${formato}`);
  await rm(pasta, { recursive: true, force: true });
  await mkdir(pasta, { recursive: true });
  const marca = await readFile(path.join(RAIZ, '..', 'frontend', 'public', 'favicon.svg'), 'utf8');

  // ------------------------------------------------------------- as artes
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await navegador.newPage();
  await page.setViewport({ width: f.largura, height: f.altura, deviceScaleFactor: 1 });

  /** Renderiza uma arte; com `recorte`, só a caixa daquele elemento (e devolve onde ela fica). */
  async function arte(nome, corpo, transparente, recorte) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTES}">
      <style>
        *{margin:0;box-sizing:border-box}
        html,body{width:${f.largura}px;height:${f.altura}px;background:${transparente ? 'transparent' : '#13171A'};overflow:hidden}
        .rotulo{font:700 ${f.legenda.rotulo}px/1.2 'Space Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#B9F706}
        .texto{font:600 ${f.legenda.texto}px/1.08 Fraunces,Georgia,serif;letter-spacing:-.02em;color:#FCFAF6;text-wrap:balance}
        .apoio{font:400 ${Math.round(f.legenda.texto * 0.56)}px/1.4 Archivo,system-ui,sans-serif;color:#C9C4BA}
        .endereco{font:700 ${Math.round(f.legenda.texto * 0.46)}px/1.2 'Space Mono',monospace;color:#B9F706}
        svg{display:block}
      </style></head><body>${corpo}</body></html>`, { waitUntil: 'load' });
    // Só fotografa com as três fontes da marca carregadas (a reserva Georgia
    // passaria despercebida até o vídeo estar no ar).
    const fontes = await page.evaluate(async () => {
      await Promise.all(["600 40px Fraunces", "700 20px 'Space Mono'", '400 20px Archivo'].map((f) => document.fonts.load(f, 'Aç')));
      return document.fonts.check('600 40px Fraunces', 'Aç') && document.fonts.check("700 20px 'Space Mono'", 'Aç');
    });
    if (!fontes) throw new Error('as fontes da marca não carregaram (sem internet?)');
    const destino = path.join(pasta, `${nome}.png`);
    let clip;
    if (recorte) {
      const r = await page.$eval(recorte, (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
      // Pares: o yuv420p do vídeo final não gosta de bordas em pixel ímpar.
      const x = Math.max(0, Math.floor(r[0] / 2) * 2 - 8);
      const y = Math.max(0, Math.floor(r[1] / 2) * 2 - 8);
      clip = { x, y, width: Math.ceil((r[2] - x + 8) / 2) * 2, height: Math.ceil((r[3] - y + 8) / 2) * 2 };
    }
    await page.screenshot({ path: destino, omitBackground: transparente, clip });
    return clip ? { arquivo: destino, x: clip.x, y: clip.y } : destino;
  }

  // Fundo: palco escuro com o refletor verde atrás da tela do site.
  const cx = f.tela.x + f.tela.largura / 2;
  const cy = f.tela.y + f.tela.altura / 2;
  const fundo = await arte('fundo', `
    <div style="position:absolute;inset:0;background:
      radial-gradient(ellipse ${Math.round(f.tela.largura * 0.8)}px ${Math.round(f.tela.altura * 0.62)}px at ${cx}px ${cy}px, rgba(185,247,6,.13), transparent 72%),
      linear-gradient(#13171A, #1C2226)"></div>
    <div style="position:absolute;left:${f.tela.x}px;top:${f.tela.y}px;width:${f.tela.largura}px;height:${f.tela.altura}px;
      border-radius:${f.tela.raio}px;box-shadow:0 40px 100px rgba(0,0,0,.6),0 0 0 3px rgba(252,250,246,.10)"></div>`, false);

  // Máscara da tela: branco onde o site aparece (cantos arredondados), preto fora.
  const mascara = await arte('mascara', `
    <div style="position:absolute;inset:0;background:#000"></div>
    <div style="position:absolute;left:0;top:0;width:${f.tela.largura}px;height:${f.tela.altura}px;
      border-radius:${f.tela.raio}px;background:#fff"></div>`, false);

  const pngsLegenda = [];
  for (const [i, l] of legendas.entries()) {
    pngsLegenda.push(await arte(`legenda-${i}`, `
      <div id="legenda" style="position:absolute;left:${f.legenda.x}px;top:${f.legenda.topo}px;width:${f.legenda.largura}px">
        ${l.rotulo ? `<div class="rotulo" style="margin-bottom:${Math.round(f.legenda.rotulo * 0.6)}px">${l.rotulo}</div>` : ''}
        <div class="texto">${l.texto}</div>
      </div>`, true, '#legenda'));
  }

  const pngCartela = await arte('cartela', `
    <div style="position:absolute;inset:0;background:
      radial-gradient(ellipse 70% 40% at 50% 46%, rgba(185,247,6,.14), transparent 72%), #13171A;
      display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 96px">
      <div style="width:112px;margin-bottom:30px">${marca.replace('<svg ', `<svg width="100%" `)}</div>
      <div style="font:600 104px/1 Fraunces,Georgia,serif;letter-spacing:-.03em;color:#FCFAF6;margin-bottom:26px">${cartela.titulo}</div>
      ${cartela.linhas.map((linha, i) => `<div class="${i === cartela.linhas.length - 1 ? 'endereco' : 'apoio'}"
        style="margin-top:${i === cartela.linhas.length - 1 ? 30 : 6}px">${linha}</div>`).join('')}
    </div>`, false);
  await navegador.close();

  // ------------------------------------------------------------ composição
  // Cada arte entra uma vez só e o filtro loop a repete na memória: com
  // -loop 1 o ffmpeg decodificaria o PNG de novo a cada quadro.
  const duracaoSite = await duracao(gravacao);
  const total = duracaoSite + segundosCartela;
  const entradas = ['-i', fundo, '-i', gravacao, '-i', mascara];
  for (const p of pngsLegenda) entradas.push('-i', p.arquivo);
  entradas.push('-i', pngCartela);
  const parada = (n) => `[${n}:v]loop=loop=-1:size=1:start=0,setpts=N/30/TB`;

  const filtros = [
    // Site: congela o último quadro durante a cartela, encolhe para a tela e recorta os cantos.
    `[1:v]tpad=stop_mode=clone:stop_duration=${segundosCartela + 1},scale=${f.tela.largura}:${f.tela.altura}:flags=lanczos,format=rgba[site]`,
    `${parada(2)},crop=${f.tela.largura}:${f.tela.altura}:0:0,format=gray[mascara]`,
    '[site][mascara]alphamerge[tela]',
    `${parada(0)}[fundo]`,
    `[fundo][tela]overlay=${f.tela.x}:${f.tela.y}:format=auto:shortest=1[v0]`,
  ];
  let atual = 'v0';
  legendas.forEach((l, i) => {
    const sai = Math.max(l.de + 0.4, l.ate - 0.35);
    filtros.push(`${parada(3 + i)},format=rgba,fade=in:st=${l.de.toFixed(3)}:d=0.35:alpha=1,fade=out:st=${sai.toFixed(3)}:d=0.35:alpha=1[l${i}]`);
    filtros.push(`[${atual}][l${i}]overlay=${pngsLegenda[i].x}:${pngsLegenda[i].y}:enable='between(t,${l.de.toFixed(3)},${l.ate.toFixed(3)})'[v${i + 1}]`);
    atual = `v${i + 1}`;
  });
  const entradaCartela = 3 + legendas.length;
  filtros.push(`${parada(entradaCartela)},format=rgba,fade=in:st=${duracaoSite.toFixed(3)}:d=0.5:alpha=1[cartela]`);
  filtros.push(`[${atual}][cartela]overlay=0:0:enable='gte(t,${duracaoSite.toFixed(3)})',format=yuv420p[final]`);

  const destino = path.join(RAIZ, 'saida', arquivo);
  await ffmpeg([
    '-y', '-v', 'error', ...entradas,
    '-f', 'lavfi', '-t', String(total), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-filter_complex', filtros.join(';'),
    '-map', '[final]', '-map', `${entradaCartela + 1}:a`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k', '-t', total.toFixed(3), '-movflags', '+faststart',
    destino,
  ]);
  // Capa para escolher na hora de postar: um quadro com a primeira legenda já assentada.
  const capa = destino.replace(/\.mp4$/, '-capa.jpg');
  const tCapa = legendas.length ? Math.min(legendas[0].ate - 0.5, legendas[0].de + 2.5) : 2;
  await ffmpeg(['-y', '-v', 'error', '-ss', tCapa.toFixed(2), '-i', destino, '-frames:v', '1', '-q:v', '2', capa]);
  console.log(`  vídeo final: saida/${arquivo} (${total.toFixed(1)} s) + capa ${path.basename(capa)}`);
  return destino;
}

/**
 * Monta a partir do que o gravador deixou em saida/: o MP4 do site e o JSON
 * com o trecho de cada cena. `legendas` é { chave: { rotulo, texto } }.
 */
export async function montarComCenas({ gravacao, legendas, ...resto }) {
  const site = path.join(RAIZ, 'saida', gravacao);
  let cenas;
  try {
    cenas = JSON.parse(await readFile(site.replace(/\.mp4$/, '.cenas.json'), 'utf8'));
  } catch {
    throw new Error(`não achei a gravação ${gravacao} — rode sem --montar primeiro`);
  }
  return montar({
    ...resto,
    gravacao: site,
    legendas: cenas.filter((c) => legendas[c.chave]).map((c) => ({ ...legendas[c.chave], de: c.de, ate: c.ate })),
  });
}

function duracao(arquivo) {
  return new Promise((ok, falha) => {
    const p = spawn(process.env.FFPROBE ?? 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo]);
    let saida = '';
    p.stdout.on('data', (d) => { saida += d; });
    p.on('error', falha);
    p.on('exit', () => ok(Number(saida.trim())));
  });
}
