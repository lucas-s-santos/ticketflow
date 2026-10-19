// Montagem no formato dos Reels do Lucas (o mesmo de exemplo-reels.mp4):
//
//   1. Abertura gravada no celular (opcional): ele pensando enquanto um
//      comentário de cliente aparece na tela ("Lucas, consegue fazer?").
//   2. Transição em fatias para o palco: fundo na cor do projeto, nome e cargo
//      no alto, o site rodando numa janela de navegador e as tecnologias embaixo.
//   3. Dissolve para a tela final preta com o @.
//
// As artes são HTML fotografado pelo Chrome; o ffmpeg só compõe.
import puppeteer from 'puppeteer-core';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { CHROME, RAIZ, ffmpeg } from './gravador.mjs';

const L = 1080;
const A = 1920;
const FPS = 30;

/** Medidas tiradas do exemplo-reels.mp4 (px do vídeo final). */
export const JANELA = { x: 40, y: 600, largura: 1000, barra: 40, conteudo: 625, raio: 18 };
const CABECALHO_Y = 252;
const ICONES_Y = 1540;
const TRANSICAO = 0.5;   // fatias: abertura → palco
const DISSOLVE = 0.8;    // palco → tela final

const FONTES = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap';

/**
 * @param {object} o
 * @param {string} o.site            MP4 do site (desktop 16:10), saída de g.montar
 * @param {string} [o.abertura]      vídeo do celular para o começo (sem ele, o Reels começa no palco)
 * @param {object} [o.comentario]    { usuario, texto, quando, aparece (s), topo (px) }
 * @param {object} o.marca           { nome, cargo, arroba, fundo:[cima, baixo], destaque, tinta, rotulo }
 * @param {string} o.tituloJanela    texto da barra de endereço
 * @param {Array<{arquivo?:string, texto?:string, nome:string}>} o.icones
 * @param {string} o.arquivo         MP4 final em saida/
 * @param {number} [o.segundosFinal] quanto a tela final fica parada
 * @param {boolean} [o.somAbertura]  manter o som da abertura (o padrão é mudo: a música entra no app)
 */
export async function montarReels({ site, abertura, comentario, marca, tituloJanela, icones, arquivo, segundosFinal = 3, somAbertura = false }) {
  const pasta = path.join(RAIZ, 'saida', 'artes-reels');
  await rm(pasta, { recursive: true, force: true });
  await mkdir(pasta, { recursive: true });
  const favicon = await readFile(path.join(RAIZ, '..', 'frontend', 'public', 'favicon.svg'), 'utf8');
  const svgs = await Promise.all(icones.map((i) => (i.arquivo ? readFile(path.join(RAIZ, 'lib', 'icones', i.arquivo), 'utf8') : null)));

  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await navegador.newPage();
  await page.setViewport({ width: L, height: A, deviceScaleFactor: 1 });

  async function arte(nome, corpo, { transparente = false, recorte } = {}) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTES}">
      <style>
        *{margin:0;box-sizing:border-box}
        html,body{width:${L}px;height:${A}px;overflow:hidden;background:${transparente ? 'transparent' : '#000'};
          font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
        svg{display:block}
      </style></head><body>${corpo}</body></html>`, { waitUntil: 'load' });
    const ok = await page.evaluate(async () => {
      await Promise.all(['400 30px Inter', '800 30px Inter'].map((f) => document.fonts.load(f, 'Aç')));
      return document.fonts.check('800 30px Inter', 'Aç');
    });
    if (!ok) throw new Error('a fonte Inter não carregou (sem internet?)');
    const destino = path.join(pasta, `${nome}.png`);
    let clip;
    if (recorte) {
      const r = await page.$eval(recorte, (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; });
      const x = Math.max(0, Math.floor(r[0] / 2) * 2 - 24);
      const y = Math.max(0, Math.floor(r[1] / 2) * 2 - 24);
      clip = { x, y, width: Math.min(L - x, Math.ceil((r[2] - x + 24) / 2) * 2), height: Math.ceil((r[3] - y + 32) / 2) * 2 };
    }
    await page.screenshot({ path: destino, omitBackground: transparente, clip });
    return clip ? { arquivo: destino, x: clip.x, y: clip.y } : destino;
  }

  const cabecalho = (cor) => `
    <div style="position:absolute;left:0;right:0;top:${CABECALHO_Y}px;text-align:center;color:${cor}">
      <div style="font:400 46px/1 Inter;letter-spacing:.045em">${marca.nome}</div>
      <div style="font:800 57px/1 Inter;letter-spacing:-.005em;margin-top:8px">${marca.cargo}</div>
    </div>`;

  // ------------------------------------------------------------ o palco
  const j = JANELA;
  const passo = 130;
  const x0 = L / 2 - ((icones.length - 1) * passo) / 2 - 52;
  const palco = await arte('palco', `
    <div style="position:absolute;inset:0;background:linear-gradient(${marca.fundo[0]},${marca.fundo[1]})"></div>
    ${cabecalho(marca.tinta)}
    <div style="position:absolute;left:${j.x}px;top:${j.y}px;width:${j.largura}px;height:${j.barra + j.conteudo}px;
                border-radius:${j.raio}px;background:#0B0E10;overflow:hidden;
                box-shadow:0 40px 80px -20px rgba(0,0,0,.45),0 12px 24px -12px rgba(0,0,0,.3)">
      <div style="height:${j.barra}px;display:flex;align-items:center;gap:9px;padding:0 18px;background:#14181B">
        <span style="width:12px;height:12px;border-radius:50%;background:${marca.destaque}"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#3A4046"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#3A4046"></span>
        <div style="margin-left:24px;flex:1;height:24px;border-radius:12px;background:#07090B;display:flex;align-items:center;
                    justify-content:center;font:400 15px Inter;color:#B4BAC0;letter-spacing:.01em">${tituloJanela}</div>
      </div>
    </div>
    ${icones.map((icone, i) => `
      <div style="position:absolute;left:${x0 + i * passo}px;top:${ICONES_Y}px;width:104px;height:104px;border-radius:22px;
                  background:#fff;display:grid;place-items:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.35)">
        ${svgs[i]
    ? svgs[i].replace('<svg ', `<svg width="58" height="58" fill="${marca.tinta}" `)
    : `<span style="font:800 italic 30px/1 Inter;letter-spacing:-.04em;color:${marca.tinta}">${icone.texto}</span>`}
      </div>`).join('')}
    <div style="position:absolute;left:0;right:0;top:${ICONES_Y + 128}px;text-align:center;
                font:500 22px/1 Inter;letter-spacing:.24em;color:${marca.rotulo}">
      ${icones.map((i) => i.nome.toUpperCase()).join(' · ')}
    </div>`);

  // Cantos de baixo da área do site (os de cima ficam sob a barra da janela).
  const mascara = await arte('mascara', `
    <div style="position:absolute;inset:0;background:#000"></div>
    <div style="position:absolute;left:0;top:0;width:${j.largura}px;height:${j.conteudo}px;background:#fff;
                border-radius:0 0 ${j.raio}px ${j.raio}px"></div>`);

  const final = await arte('final', `
    <div style="position:absolute;inset:0;background:#000"></div>
    <div style="position:absolute;left:0;right:0;top:880px;text-align:center;color:#fff">
      <div style="font:400 46px/1 Inter;letter-spacing:.045em">${marca.nome}</div>
      <div style="font:800 57px/1 Inter;letter-spacing:-.005em;margin-top:8px">${marca.cargo}</div>
      <div style="font:400 32px/1 Inter;color:${marca.destaque};margin-top:34px">${marca.arroba}</div>
    </div>`);

  let cartao = null;
  if (comentario) {
    // Avatar: o ícone do site recortado em círculo, com o anel na cor do projeto.
    const avatar = favicon.replace('<svg ', '<svg width="100%" height="100%" ');
    cartao = await arte('comentario', `
      <div id="cartao" style="position:absolute;left:44px;width:992px;top:${comentario.topo}px;background:#fff;border-radius:26px;
                  padding:26px 30px 24px 26px;display:flex;gap:20px;align-items:flex-start;
                  box-shadow:0 18px 40px -16px rgba(0,0,0,.35)">
        <div style="flex:none;width:84px;height:84px;border-radius:50%;padding:4px;background:${marca.destaque}">
          <div style="width:100%;height:100%;border-radius:50%;border:3px solid #fff;overflow:hidden;background:${marca.destaque}">${avatar}</div>
        </div>
        <div style="min-width:0;padding-top:2px">
          <div style="font:700 30px/1.25 Inter;color:#0F1113">${comentario.usuario}</div>
          <div style="font:400 30px/1.32 Inter;color:#0F1113;margin-top:4px;text-wrap:pretty">${comentario.texto}</div>
          <div style="font:600 22px/1 Inter;color:#8E9196;margin-top:16px">${comentario.quando}  ·  Responder</div>
        </div>
      </div>`, { transparente: true, recorte: '#cartao' });
  }
  await navegador.close();

  // ---------------------------------------------------------- composição
  const dSite = await duracao(site);
  const dAbertura = abertura ? await duracao(abertura) : 0;
  const temAudio = abertura && somAbertura ? await temFaixaDeAudio(abertura) : false;
  const dFinal = segundosFinal + DISSOLVE;
  const dCorpo = dSite + dFinal - DISSOLVE;
  const total = abertura ? dAbertura + dCorpo - TRANSICAO : dCorpo;

  // -framerate nas imagens: o xfade exige a mesma taxa dos dois lados, e uma
  // imagem parada entra como 25 qps se ninguém disser nada.
  const imagem = (arquivo) => ['-framerate', String(FPS), '-i', arquivo];
  const entradas = [...imagem(palco), '-i', site, ...imagem(mascara), ...imagem(final)];
  const parada = (n) => `[${n}:v]loop=loop=-1:size=1:start=0,setpts=N/${FPS}/TB`;
  const filtros = [
    `[1:v]scale=${j.largura}:${j.conteudo}:flags=lanczos,fps=${FPS},format=rgba[s]`,
    `${parada(2)},crop=${j.largura}:${j.conteudo}:0:0,format=gray[m]`,
    '[s][m]alphamerge[sm]',
    `${parada(0)}[p]`,
    `[p][sm]overlay=${j.x}:${j.y + j.barra}:shortest=1,format=yuv420p,settb=AVTB[secao]`,
    `${parada(3)},trim=duration=${dFinal.toFixed(3)},format=yuv420p,settb=AVTB[fim]`,
    `[secao][fim]xfade=transition=fade:duration=${DISSOLVE}:offset=${(dSite - DISSOLVE).toFixed(3)}[corpo]`,
  ];
  let saidaVideo = 'corpo';
  let mapaAudio;
  if (abertura) {
    entradas.push('-i', abertura);
    const nAbertura = 4;
    filtros.push(`[${nAbertura}:v]scale=${L}:${A}:force_original_aspect_ratio=increase,crop=${L}:${A},setsar=1,fps=${FPS},format=yuv420p[selfie]`);
    let selfie = 'selfie';
    if (cartao) {
      entradas.push(...imagem(cartao.arquivo));
      const t = comentario.aparece;
      // Entra subindo 24 px e clareando em 0,35 s.
      filtros.push(`${parada(5)},format=rgba,fade=in:st=${t}:d=0.35:alpha=1[c]`);
      filtros.push(`[selfie][c]overlay=x=${cartao.x}:y='${cartao.y}+24*max(0\\,1-(t-${t})/0.35)':eval=frame:enable='gte(t,${t})':shortest=1[selfiec]`);
      selfie = 'selfiec';
    }
    filtros.push(`[${selfie}]format=yuv420p,settb=AVTB[intro]`);
    filtros.push(`[intro][corpo]xfade=transition=vdslice:duration=${TRANSICAO}:offset=${(dAbertura - TRANSICAO).toFixed(3)}[video]`);
    saidaVideo = 'video';
    if (temAudio) {
      filtros.push(`[${nAbertura}:a]aresample=48000,apad,atrim=0:${total.toFixed(3)}[audio]`);
      mapaAudio = '[audio]';
    }
  }
  const nSilencio = entradas.filter((e) => e === '-i').length;
  entradas.push('-f', 'lavfi', '-t', total.toFixed(3), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');

  const destino = path.join(RAIZ, 'saida', arquivo);
  await ffmpeg([
    '-y', '-v', 'error', ...entradas,
    '-filter_complex', filtros.join(';'),
    '-map', `[${saidaVideo}]`, '-map', mapaAudio ?? `${nSilencio}:a`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-t', total.toFixed(3), '-movflags', '+faststart',
    destino,
  ]);
  // Capa para escolher ao postar: o palco já montado, com o site na janela.
  const capa = destino.replace(/\.mp4$/, '-capa.jpg');
  const tCapa = (abertura ? dAbertura : 0) + 2.5;
  await ffmpeg(['-y', '-v', 'error', '-ss', tCapa.toFixed(2), '-i', destino, '-frames:v', '1', '-q:v', '2', capa]);
  console.log(`  vídeo final: saida/${arquivo} (${total.toFixed(1)} s${abertura ? `, abertura de ${dAbertura.toFixed(1)} s` : ', sem abertura'}) + capa`);
  return { destino, cartao };
}

/**
 * Junta os melhores trechos dos vídeos do celular numa abertura só, em pé
 * (1080×1920, 30 qps). O iPhone grava deitado com rotação nos metadados; o
 * ffmpeg já desvira. Sem som: os cortes ficam secos e a música entra no app.
 *
 * @param {Array<{arquivo:string, de:number, ate:number}>} cortes  em segundos do original
 */
export async function cortarAbertura(cortes, destino) {
  const entradas = [];
  const filtros = [];
  cortes.forEach((c, i) => {
    entradas.push('-ss', c.de.toFixed(3), '-t', (c.ate - c.de).toFixed(3), '-i', c.arquivo);
    filtros.push(`[${i}:v]scale=${L}:${A}:force_original_aspect_ratio=increase,crop=${L}:${A},setsar=1,fps=${FPS},format=yuv420p,setpts=PTS-STARTPTS[t${i}]`);
  });
  filtros.push(`${cortes.map((_, i) => `[t${i}]`).join('')}concat=n=${cortes.length}:v=1:a=0[v]`);
  await ffmpeg(['-y', '-v', 'error', ...entradas, '-filter_complex', filtros.join(';'), '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-an', destino]);
  return destino;
}

/**
 * Prévia de onde o comentário fica: o cartão sobre um quadro da abertura (ou de
 * qualquer vídeo em pé), com as faixas que o Instagram cobre marcadas.
 */
export async function previaComentario({ fundo, segundo = 0, cartao, arquivo }) {
  const destino = path.join(RAIZ, 'saida', arquivo);
  await ffmpeg([
    '-y', '-v', 'error', '-ss', String(segundo), '-i', fundo, '-i', cartao.arquivo,
    '-filter_complex',
    `[0:v]scale=${L}:${A}:force_original_aspect_ratio=increase,crop=${L}:${A}[f];[f][1:v]overlay=${cartao.x}:${cartao.y},`
      // Faixa de cima (~250 px) e de baixo (~320 px) que a interface do Reels cobre.
      + `drawbox=x=0:y=0:w=${L}:h=250:color=red@0.22:t=fill,drawbox=x=0:y=${A - 320}:w=${L}:h=320:color=red@0.22:t=fill`,
    '-frames:v', '1', '-q:v', '2', destino,
  ]);
  return destino;
}

function sondar(args) {
  return new Promise((ok, falha) => {
    const p = spawn(process.env.FFPROBE ?? 'ffprobe', args);
    let saida = '';
    p.stdout.on('data', (d) => { saida += d; });
    p.on('error', falha);
    p.on('exit', () => ok(saida.trim()));
  });
}
const duracao = async (arquivo) => Number(await sondar(['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo]));
const temFaixaDeAudio = async (arquivo) => (await sondar(['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', arquivo])) !== '';
