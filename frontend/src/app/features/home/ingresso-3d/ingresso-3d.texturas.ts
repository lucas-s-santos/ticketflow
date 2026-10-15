/**
 * As faces do ingresso 3D, desenhadas em canvas.
 *
 * <p>Por que canvas e não uma imagem pronta: o ingresso usa as mesmas fontes e
 * as mesmas cores da interface. Se a marca mudar, ele muda junto, e não há um
 * PNG de 2 MB para baixar antes de o hero aparecer.
 *
 * <p>Cada face tem a proporção exata da geometria (LARGURA x ALTURA). O verso é
 * desenhado espelhado — o canhoto fica à esquerda — porque é assim que ele
 * aparece quando o ingresso vira.
 */

/** Medidas do ingresso, em unidades da cena. A geometria e as texturas leem daqui. */
export const LARGURA = 3.4;
export const ALTURA = 1.5;

/** Onde o canhoto se destaca do corpo, em fração da largura, vista de frente. */
export const POSICAO_PERFURACAO = 0.72;

/** Contorno, em unidades da cena. A geometria 3D e a janela do show leem daqui. */
export const RAIO_CANTO = 0.08;
export const RAIO_RECORTE = 0.13;
export const DENTES = 6;
export const RAIO_DENTE = 0.045;

/** Selo holográfico, em pixels da textura da frente. */
const SELO = { x: 1240, y: 392, raio: 104 };

const CW = 2048;
const CH = Math.round((CW * ALTURA) / LARGURA);
const PERFURACAO_FRENTE = Math.round(CW * POSICAO_PERFURACAO);
const PERFURACAO_VERSO = CW - PERFURACAO_FRENTE;
const MARGEM = 96;

const COR = {
  tinta: '#13171A',
  tinta700: '#333B41',
  tinta400: '#7A8389',
  papel: '#FCFAF6',
  papel300: '#C9C4BA',
  acento: '#B9F706',
  acentoFundo: '#8FBF05',
};

const MONO = '"Space Mono", ui-monospace, monospace';
const SERIFA = 'Fraunces, Georgia, serif';
const SANS = 'Archivo, system-ui, sans-serif';

/**
 * Espera as fontes da marca antes de desenhar. Canvas não troca a fonte depois:
 * o que for desenhado com a fonte reserva fica com ela para sempre. O limite de
 * tempo evita que uma rede lenta segure o hero vazio.
 */
export async function carregarFontes(): Promise<void> {
  const pedidos = [
    `600 200px ${SERIFA}`,
    `400 40px ${SANS}`,
    `600 40px ${SANS}`,
    `400 24px ${MONO}`,
    `700 24px ${MONO}`,
  ].map((fonte) => document.fonts.load(fonte));
  const limite = new Promise<void>((resolver) => setTimeout(resolver, 2500));
  await Promise.race([Promise.all(pedidos), limite]).catch(() => undefined);
}

// ===========================================================================
// FRENTE — preta, com o selo holográfico e o QR no canhoto
// ===========================================================================

export function desenharFrente(): HTMLCanvasElement {
  const { canvas, g } = novoCanvas();
  const xp = PERFURACAO_FRENTE;

  g.fillStyle = COR.tinta;
  g.fillRect(0, 0, CW, CH);

  // Um centro levemente mais claro, como cartão sob refletor.
  const luz = g.createRadialGradient(CW * 0.32, CH * 0.38, 40, CW * 0.32, CH * 0.38, CW * 0.7);
  luz.addColorStop(0, 'rgba(252, 250, 246, 0.05)');
  luz.addColorStop(1, 'rgba(252, 250, 246, 0)');
  g.fillStyle = luz;
  g.fillRect(0, 0, CW, CH);

  // ---- Corpo ----
  desenharMarca(g, MARGEM, MARGEM - 8, 3.4, { corpo: COR.papel, qr: COR.acento, miolo: COR.papel, pontos: COR.tinta });
  texto(g, 'INGRESSO DIGITAL', MARGEM + 92, MARGEM + 30, { fonte: `700 24px ${MONO}`, cor: COR.acento, espaco: 6 });
  texto(g, 'ADMITE UMA PESSOA', xp - MARGEM, MARGEM + 30, { fonte: `400 24px ${MONO}`, cor: COR.tinta400, espaco: 6, alinhar: 'right' });

  regua(g, MARGEM, 196, xp - MARGEM, COR.tinta700);

  texto(g, 'Canhoto', MARGEM - 10, 452, { fonte: `600 236px ${SERIFA}`, cor: COR.papel, espaco: -6 });
  texto(g, 'Uma parte fica na portaria. A outra fica com você.', MARGEM, 548, { fonte: `400 38px ${SANS}`, cor: COR.papel300 });

  desenharSelo(g);

  regua(g, MARGEM, 648, xp - MARGEM, COR.tinta700);

  const campos: Array<[string, string]> = [
    ['SETOR', 'Pista'],
    ['PORTÃO', 'B'],
    ['ABERTURA', '20h00'],
    ['VALIDADE', 'Uso único'],
  ];
  const coluna = (xp - 2 * MARGEM) / campos.length;
  campos.forEach(([rotulo, valor], i) => {
    const x = MARGEM + i * coluna;
    texto(g, rotulo, x, 714, { fonte: `400 20px ${MONO}`, cor: COR.tinta400, espaco: 5 });
    texto(g, valor, x, 780, { fonte: `600 44px ${SANS}`, cor: COR.papel });
  });

  perfuracao(g, xp, '#2B3338');

  // ---- Canhoto ----
  const cx = xp + (CW - xp) / 2;
  texto(g, 'CANHOTO', cx, MARGEM + 30, { fonte: `700 24px ${MONO}`, cor: COR.acento, espaco: 8, alinhar: 'center' });
  desenharQr(g, cx, 412, 320);
  texto(g, 'Nº 000 001', cx, 650, { fonte: `700 36px ${MONO}`, cor: COR.papel, alinhar: 'center' });
  texto(g, 'a7f3 9c2e 41bd', cx, 700, { fonte: `400 22px ${MONO}`, cor: COR.tinta400, espaco: 2, alinhar: 'center' });

  return canvas;
}

/**
 * Mapa de material da frente, um canal por propriedade — é assim que o
 * MeshPhysicalMaterial lê: iridescência no R, rugosidade no G, metal no B.
 * Só o selo é metálico, liso e iridescente; o resto é cartão fosco.
 */
export function desenharMapaMaterial(): HTMLCanvasElement {
  const { canvas, g } = novoCanvas();
  g.fillStyle = 'rgb(0, 150, 0)';
  g.fillRect(0, 0, CW, CH);
  g.fillStyle = 'rgb(255, 56, 255)';
  g.beginPath();
  g.arc(SELO.x, SELO.y, SELO.raio, 0, Math.PI * 2);
  g.fill();
  return canvas;
}

/**
 * Só o selo em branco, o resto preto: é o mapa de emissão que faz o selo acender
 * em vermelho quando a demonstração da assinatura acusa adulteração.
 */
export function desenharMascaraSelo(): HTMLCanvasElement {
  const { canvas, g } = novoCanvas();
  g.fillStyle = '#000';
  g.fillRect(0, 0, CW, CH);
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(SELO.x, SELO.y, SELO.raio, 0, Math.PI * 2);
  g.fill();
  return canvas;
}

/**
 * O contorno do ingresso em SVG, com as mesmas medidas da geometria 3D (em
 * centésimos de unidade, eixo Y para baixo). É a máscara da janela do show:
 * o ingresso 3D chega, some, e a foto aparece recortada exatamente no formato
 * dele.
 */
export function svgDoIngresso(): string {
  const k = 100;
  const f = (v: number) => Number(v.toFixed(2));
  const W = f(LARGURA * k);
  const H = f(ALTURA * k);
  const r = f(RAIO_CANTO * k);
  const n = f(RAIO_RECORTE * k);
  const d = f(RAIO_DENTE * k);
  const xp = f(W * POSICAO_PERFURACAO);
  const passo = (H - 2 * r) / DENTES;

  // Sentido horário a partir do canto superior esquerdo. Nos arcos, sweep 0 é
  // a mordida para dentro e sweep 1 é o canto arredondado para fora.
  let p = `M${r},0 H${f(xp - n)} A${n},${n} 0 0 0 ${f(xp + n)},0 H${f(W - r)} A${r},${r} 0 0 1 ${W},${r}`;
  for (let i = 0; i < DENTES; i++) {
    const cy = r + passo * (i + 0.5);
    p += ` V${f(cy - d)} A${d},${d} 0 0 0 ${W},${f(cy + d)}`;
  }
  p += ` V${f(H - r)} A${r},${r} 0 0 1 ${f(W - r)},${H} H${f(xp + n)} A${n},${n} 0 0 0 ${f(xp - n)},${H}`;
  p += ` H${r} A${r},${r} 0 0 1 0,${f(H - r)} V${r} A${r},${r} 0 0 1 ${r},0 Z`;
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><path d='${p}'/></svg>`;
}

/**
 * Espessura do filme iridescente (canal G). Variar a espessura em leque faz as
 * cores correrem ao redor do selo quando ele gira, como num holograma de
 * verdade — com espessura uniforme o selo inteiro mudaria de cor de uma vez.
 */
export function desenharMapaEspessura(): HTMLCanvasElement {
  const { canvas, g } = novoCanvas();
  g.fillStyle = '#000';
  g.fillRect(0, 0, CW, CH);

  if (typeof g.createConicGradient === 'function') {
    const leque = g.createConicGradient(0, SELO.x, SELO.y);
    for (let i = 0; i <= 6; i++) {
      leque.addColorStop(i / 6, i % 2 === 0 ? '#202020' : '#f0f0f0');
    }
    g.fillStyle = leque;
  } else {
    const faixa = g.createLinearGradient(SELO.x - SELO.raio, SELO.y, SELO.x + SELO.raio, SELO.y);
    faixa.addColorStop(0, '#202020');
    faixa.addColorStop(0.5, '#f0f0f0');
    faixa.addColorStop(1, '#202020');
    g.fillStyle = faixa;
  }
  g.beginPath();
  g.arc(SELO.x, SELO.y, SELO.raio, 0, Math.PI * 2);
  g.fill();
  return canvas;
}

// ===========================================================================
// VERSO — verde da marca, espelhado: o canhoto aparece à esquerda
// ===========================================================================

export function desenharVerso(): HTMLCanvasElement {
  const { canvas, g } = novoCanvas();
  const xp = PERFURACAO_VERSO;

  g.fillStyle = COR.acento;
  g.fillRect(0, 0, CW, CH);

  // ---- Canhoto: código de barras deitado ----
  codigoDeBarras(g, 110, 120, xp - 220, 640);
  texto(g, '000 001', xp / 2, 820, { fonte: `700 26px ${MONO}`, cor: COR.tinta, espaco: 4, alinhar: 'center' });

  perfuracao(g, xp, COR.acentoFundo);

  // ---- Corpo ----
  const x = xp + 110;
  const larguraUtil = CW - MARGEM - x;

  desenharMarca(g, x, MARGEM - 8, 3.4, { corpo: COR.tinta, qr: COR.acento, miolo: COR.tinta, pontos: COR.papel });
  texto(g, 'Canhoto', x + 92, MARGEM + 40, { fonte: `600 52px ${SERIFA}`, cor: COR.tinta });

  const linhas = ['Uma parte fica na portaria.', 'A outra fica com você.'];
  const tamanho = fonteQueCabe(g, linhas, `600 {t}px ${SERIFA}`, larguraUtil, 104);
  linhas.forEach((linha, i) => {
    texto(g, linha, x - 4, 380 + i * tamanho * 1.08, { fonte: `600 ${tamanho}px ${SERIFA}`, cor: COR.tinta, espaco: -2 });
  });

  regua(g, x, 670, CW - MARGEM, 'rgba(19, 23, 26, 0.25)');

  const termos = [
    'Válido para uma única entrada. O código é assinado com HMAC-SHA256:',
    'trocar um caractere invalida o ingresso inteiro.',
  ];
  termos.forEach((linha, i) => {
    texto(g, linha, x, 740 + i * 38, { fonte: `400 22px ${MONO}`, cor: 'rgba(19, 23, 26, 0.78)' });
  });

  return canvas;
}

// ===========================================================================
// Peças
// ===========================================================================

interface CoresMarca {
  readonly corpo: string;
  readonly qr: string;
  readonly miolo: string;
  readonly pontos: string;
}

/** A logo do Canhoto (o mesmo desenho do favicon), em escala. */
function desenharMarca(g: CanvasRenderingContext2D, x: number, y: number, escala: number, cores: CoresMarca): void {
  g.save();
  // O desenho do favicon começa em (4, 9) no viewBox de 32x32.
  g.translate(x - 4 * escala, y - 9 * escala);
  g.scale(escala, escala);

  g.fillStyle = cores.corpo;
  g.fill(new Path2D(
    'M6 9 H23 a1.75 1.75 0 0 1 0 3.5 a1.75 1.75 0 0 0 0 3.5 a1.75 1.75 0 0 1 0 3.5 ' +
    'a1.75 1.75 0 0 0 0 3.5 H6 a2 2 0 0 1 -2-2 V11 a2 2 0 0 1 2-2 Z',
  ));

  g.fillStyle = cores.qr;
  g.fillRect(6.6, 11.4, 4.2, 4.2);
  g.fillRect(14.6, 11.4, 4.2, 4.2);
  g.fillRect(6.6, 16.8, 4.2, 4.2);

  g.fillStyle = cores.miolo;
  g.fillRect(7.9, 12.7, 1.6, 1.6);
  g.fillRect(15.9, 12.7, 1.6, 1.6);
  g.fillRect(7.9, 18.1, 1.6, 1.6);

  g.fillStyle = cores.pontos;
  g.fillRect(12.2, 16.8, 1.7, 1.7);
  g.fillRect(14.6, 19.2, 1.7, 1.7);
  g.fillRect(17, 16.8, 1.7, 1.7);

  g.restore();
}

/**
 * O selo, na textura de cor. A base prateada é o que o metal reflete; o
 * arco-íris vem do material (iridescência), não daqui.
 */
function desenharSelo(g: CanvasRenderingContext2D): void {
  const { x, y, raio } = SELO;

  const prata = g.createLinearGradient(x - raio, y - raio, x + raio, y + raio);
  prata.addColorStop(0, '#E8ECEE');
  prata.addColorStop(1, '#A9B1B6');
  g.fillStyle = prata;
  g.beginPath();
  g.arc(x, y, raio, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = 'rgba(19, 23, 26, 0.32)';
  g.lineWidth = 3;
  for (const r of [raio - 12, raio - 46]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
  }

  // Texto correndo em volta do selo, letra por letra.
  const frase = 'CANHOTO AUTÊNTICO · ASSINADO COM HMAC · ';
  const passo = (Math.PI * 2) / frase.length;
  g.save();
  g.translate(x, y);
  g.font = `700 16px ${MONO}`;
  g.fillStyle = 'rgba(19, 23, 26, 0.6)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < frase.length; i++) {
    g.save();
    g.rotate(i * passo);
    g.fillText(frase[i], 0, -(raio - 29));
    g.restore();
  }
  g.restore();

  const escala = 2.9;
  desenharMarca(g, x - 10.4 * escala, y - 7 * escala, escala, {
    corpo: 'rgba(19, 23, 26, 0.55)',
    qr: '#D5DADD',
    miolo: 'rgba(19, 23, 26, 0.55)',
    pontos: '#D5DADD',
  });
}

/**
 * QR decorativo. Tem os três localizadores, o padrão de alinhamento e a
 * temporização de um QR versão 2 de verdade — o olho reconhece como QR —, mas
 * os dados são sorteados com semente fixa. Não leva a lugar nenhum de propósito:
 * um QR que funciona num banner de marketing é convite a golpe.
 */
function desenharQr(g: CanvasRenderingContext2D, cx: number, cy: number, lado: number): void {
  const n = 25;
  const folga = 22;
  const modulo = Math.floor((lado - 2 * folga) / n);
  const inicio = { x: cx - (modulo * n) / 2, y: cy - (modulo * n) / 2 };

  g.fillStyle = COR.papel;
  retanguloArredondado(g, cx - lado / 2, cy - lado / 2, lado, lado, 16);
  g.fill();

  g.fillStyle = COR.tinta;
  const modulos = modulosQr(n, 0xc4a407);
  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (modulos[l][c]) {
        g.fillRect(inicio.x + c * modulo, inicio.y + l * modulo, modulo, modulo);
      }
    }
  }
}

function modulosQr(n: number, semente: number): boolean[][] {
  const sorteio = mulberry32(semente);
  const m = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  const fixo = Array.from({ length: n }, () => Array<boolean>(n).fill(false));

  const localizador = (l0: number, c0: number) => {
    for (let l = -1; l <= 7; l++) {
      for (let c = -1; c <= 7; c++) {
        const L = l0 + l;
        const C = c0 + c;
        if (L < 0 || C < 0 || L >= n || C >= n) continue;
        fixo[L][C] = true;
        const dentro = l >= 0 && l <= 6 && c >= 0 && c <= 6;
        const borda = l === 0 || l === 6 || c === 0 || c === 6;
        const miolo = l >= 2 && l <= 4 && c >= 2 && c <= 4;
        m[L][C] = dentro && (borda || miolo);
      }
    }
  };
  localizador(0, 0);
  localizador(0, n - 7);
  localizador(n - 7, 0);

  const a = n - 9;
  for (let l = 0; l < 5; l++) {
    for (let c = 0; c < 5; c++) {
      fixo[a + l][a + c] = true;
      m[a + l][a + c] = l === 0 || l === 4 || c === 0 || c === 4 || (l === 2 && c === 2);
    }
  }

  for (let i = 8; i < n - 8; i++) {
    fixo[6][i] = fixo[i][6] = true;
    m[6][i] = m[i][6] = i % 2 === 0;
  }

  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (!fixo[l][c]) m[l][c] = sorteio() < 0.47;
    }
  }
  return m;
}

/** Barras horizontais empilhadas: o código de barras deitado no canhoto do verso. */
function codigoDeBarras(g: CanvasRenderingContext2D, x: number, y: number, largura: number, altura: number): void {
  const sorteio = mulberry32(0xbadc0de);
  const espessuras = [4, 4, 8, 12, 16];
  const vaos = [5, 8, 11];
  g.fillStyle = COR.tinta;
  let cursor = y;
  while (cursor < y + altura) {
    const barra = espessuras[Math.floor(sorteio() * espessuras.length)];
    g.fillRect(x, cursor, largura, Math.min(barra, y + altura - cursor));
    cursor += barra + vaos[Math.floor(sorteio() * vaos.length)];
  }
}

/** A linha de furos onde o canhoto se destaca. Os recortes nas bordas vêm da geometria. */
function perfuracao(g: CanvasRenderingContext2D, x: number, cor: string): void {
  g.fillStyle = cor;
  for (let y = 46; y < CH - 40; y += 22) {
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fill();
  }
}

function regua(g: CanvasRenderingContext2D, x1: number, y: number, x2: number, cor: string): void {
  g.fillStyle = cor;
  g.fillRect(x1, y, x2 - x1, 3);
}

interface EstiloTexto {
  readonly fonte: string;
  readonly cor: string;
  readonly alinhar?: CanvasTextAlign;
  /** Espaçamento entre letras, em px. */
  readonly espaco?: number;
}

function texto(g: CanvasRenderingContext2D, conteudo: string, x: number, y: number, estilo: EstiloTexto): void {
  g.font = estilo.fonte;
  g.fillStyle = estilo.cor;
  g.textAlign = estilo.alinhar ?? 'left';
  g.textBaseline = 'alphabetic';
  espacamento(g, estilo.espaco ?? 0);
  g.fillText(conteudo, x, y);
  espacamento(g, 0);
}

/** letterSpacing no canvas é recente; onde não existir, o texto sai sem ele. */
function espacamento(g: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in g) {
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  }
}

/** Maior tamanho de fonte (até o teto) em que todas as linhas cabem na largura. */
function fonteQueCabe(g: CanvasRenderingContext2D, linhas: string[], modelo: string, largura: number, teto: number): number {
  g.font = modelo.replace('{t}', String(teto));
  const maior = Math.max(...linhas.map((l) => g.measureText(l).width));
  return maior > largura ? Math.floor((teto * largura) / maior) : teto;
}

function retanguloArredondado(g: CanvasRenderingContext2D, x: number, y: number, l: number, a: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + l, y, x + l, y + a, r);
  g.arcTo(x + l, y + a, x, y + a, r);
  g.arcTo(x, y + a, x, y, r);
  g.arcTo(x, y, x + l, y, r);
  g.closePath();
}

function novoCanvas(): { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  return { canvas, g: canvas.getContext('2d')! };
}

/** Sorteio com semente: o QR e o código de barras saem iguais em toda visita. */
function mulberry32(semente: number): () => number {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
