import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Shape,
  ShapeGeometry,
  Texture,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import {
  ALTURA,
  DENTES,
  LARGURA,
  POSICAO_PERFURACAO,
  RAIO_CANTO,
  RAIO_DENTE,
  RAIO_RECORTE,
  carregarFontes,
  desenharFrente,
  desenharMapaEspessura,
  desenharMapaMaterial,
  desenharMascaraSelo,
  desenharVerso,
} from './ingresso-3d.texturas';
import type { Parada } from './roteiro';

/**
 * A cena do ingresso 3D que viaja pela home.
 *
 * <p>Este arquivo é carregado sob demanda (import dinâmico no componente), então
 * o Three.js — de longe a maior dependência do front — só é baixado por quem
 * abre a home, e depois que a página já está na tela.
 *
 * <p><b>Como ele viaja.</b> O canvas é {@code position: fixed} e do tamanho do
 * hero, não da tela inteira: um canvas WebGL do tamanho da janela, em tela de
 * alta densidade, pintaria milhões de pixels por quadro para mostrar um
 * cartão. A cada quadro a cena descobre em que trecho do roteiro a rolagem está
 * e move o canvas com transform de CSS até a âncora da vez. O Three.js cuida só
 * do que só ele faz: pose, giro, o rasgo e o selo.
 *
 * <p>Nada aqui passa pelo Angular: o componente chama {@link montarCena} fora da
 * zona. Um loop de 60 quadros por segundo dentro da zona dispararia detecção de
 * mudanças na aplicação inteira a cada quadro.
 */

const ESPESSURA = 0.04;

/** Folga do quadro em volta do ingresso: espaço para girar, inclinar e rasgar sem cortar. */
const FOLGA = 1.45;

/**
 * O canvas é maior que a âncora do hero na mesma proporção da folga, para o
 * ingresso aparecer no hero em escala ~1 (nítido) mesmo com a folga em volta.
 * Nas outras paradas ele só encolhe — e encolher bitmap não borra.
 */
const AMPLIA_CANVAS = 1.35;

/** Quanto a rotação acompanha o ponteiro, em radianos, de uma borda à outra da tela. */
const INCLINACAO_PONTEIRO = { x: 0.22, y: 0.32 };

/** Cor do selo quando a assinatura não confere: o vermelho de erro da interface. */
const VERMELHO_ADULTERADO = '#E5484D';

export interface OpcoesCena {
  readonly movimentoReduzido: boolean;
  /** As paradas da viagem, na ordem da página. A primeira é o hero. */
  readonly roteiro: readonly Parada[];
  /** Onde procurar as âncoras e a dica de arraste. */
  readonly raiz: HTMLElement;
}

export interface CenaIngresso {
  /** Verdadeiro quando não houve WebGL e o ingresso virou imagem chapada no hero. */
  readonly semWebGL: boolean;
  destruir(): void;
}

/** O que o roteiro define em cada ponto da rolagem, já interpolado. */
interface Momento {
  cx: number;
  cy: number;
  largura: number;
  poseX: number;
  poseY: number;
  poseZ: number;
  vida: number;
  ciclo: number;
  opacidade: number;
  rasgo: number;
}

export async function montarCena(host: HTMLElement, opcoes: OpcoesCena): Promise<CenaIngresso> {
  const { roteiro, raiz } = opcoes;
  const ancoras = roteiro.map((p) => raiz.querySelector<HTMLElement>(`[data-ancora="${p.ancora}"]`));
  const ancoraHero = ancoras[0];
  if (!ancoraHero) {
    return { semWebGL: false, destruir: () => undefined };
  }
  const secoes = new Map<string, HTMLElement | null>();
  for (const p of roteiro) {
    if (p.quando.tipo === 'secao' && !secoes.has(p.quando.seletor)) {
      secoes.set(p.quando.seletor, raiz.querySelector<HTMLElement>(p.quando.seletor));
    }
  }

  await carregarFontes();
  const frente = desenharFrente();

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    // Sem WebGL (navegador antigo, GPU bloqueada): o ingresso vira imagem chapada no hero.
    return montarSemWebGL(ancoraHero, frente);
  }

  const reduzido = opcoes.movimentoReduzido;
  const descartaveis: Array<{ dispose(): void }> = [];
  const guardar = <T extends { dispose(): void }>(item: T): T => {
    descartaveis.push(item);
    return item;
  };

  // ---------------------------------------------------------------- render
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  // Neutral preserva as cores da marca; ACES puxaria o verde para o amarelo.
  renderer.toneMapping = NeutralToneMapping;
  const tela = renderer.domElement;
  // Abaixo da navbar (z-50) e sem receber ponteiro: cliques atravessam para a
  // página. Quem recebe o arraste é a âncora do hero.
  tela.style.cssText =
    'position:fixed;left:0;top:0;z-index:40;pointer-events:none;transform-origin:0 0;' +
    'will-change:transform,opacity;opacity:0';
  tela.setAttribute('aria-hidden', 'true');
  host.appendChild(tela);

  const cena = new Scene();
  const pmrem = guardar(new PMREMGenerator(renderer));
  const ambiente = guardar(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
  cena.environment = ambiente;
  // Ambiente baixo: o reflexo do estúdio clareava o preto do cartão para cinza.
  cena.environmentIntensity = 0.3;

  const camera = new PerspectiveCamera(28, 1, 0.1, 50);

  // Luz principal quente do alto, e um contraluz verde que acende a borda.
  const chave = new DirectionalLight(0xffffff, 1.1);
  chave.position.set(2.5, 3, 4);
  const contraluz = new DirectionalLight(new Color('#B9F706'), 2.2);
  contraluz.position.set(-3, -1.5, -3);
  cena.add(chave, contraluz);

  // ------------------------------------------------------------- materiais
  const anisotropia = renderer.capabilities.getMaxAnisotropy();
  const textura = (canvas: HTMLCanvasElement, cor: boolean): Texture => {
    const t = guardar(new CanvasTexture(canvas));
    if (cor) t.colorSpace = SRGBColorSpace;
    t.anisotropy = anisotropia;
    return t;
  };
  const mapaMaterial = textura(desenharMapaMaterial(), false);

  const materialFrente = guardar(new MeshPhysicalMaterial({
    map: textura(frente, true),
    // Os valores finais vêm dos mapas; aqui ficam os multiplicadores no máximo.
    roughness: 1,
    roughnessMap: mapaMaterial,
    metalness: 1,
    metalnessMap: mapaMaterial,
    iridescence: 1,
    iridescenceMap: mapaMaterial,
    iridescenceIOR: 1.5,
    iridescenceThicknessMap: textura(desenharMapaEspessura(), false),
    iridescenceThicknessRange: [120, 820],
    // Verniz discreto: um brilho que corre pela superfície quando ela gira.
    clearcoat: 0.18,
    clearcoatRoughness: 0.4,
    specularIntensity: 0.5,
    // Apagado até a demonstração acusar adulteração; aí só o selo acende.
    emissive: new Color(VERMELHO_ADULTERADO),
    emissiveMap: textura(desenharMascaraSelo(), true),
    emissiveIntensity: 0,
  }));

  const materialVerso = guardar(new MeshPhysicalMaterial({
    map: textura(desenharVerso(), true),
    roughness: 0.55,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
    side: BackSide,
  }));

  const materialBorda = guardar(new MeshStandardMaterial({ color: new Color('#B9F706'), roughness: 0.6 }));
  // As tampas do bloco extrudado ficam invisíveis: quem aparece são as faces com
  // textura. Duas superfícies no mesmo plano brigariam pelo pixel (z-fighting).
  const semTampa = guardar(new MeshBasicMaterial({ visible: false }));

  // ------------------------------------------------------------- geometria
  // Duas peças — corpo e canhoto — que se encaixam na linha da perfuração. Juntas
  // parecem um ingresso só; no fim da home, o canhoto se solta.
  const montarPeca = (forma: Shape): Group => {
    const geoFrente = guardar(mapearUV(new ShapeGeometry(forma, 24), false));
    const geoVerso = guardar(mapearUV(new ShapeGeometry(forma, 24), true));
    const geoBorda = guardar(new ExtrudeGeometry(forma, { depth: ESPESSURA, bevelEnabled: false, curveSegments: 24 }));
    geoBorda.translate(0, 0, -ESPESSURA / 2);

    const faceFrente = new Mesh(geoFrente, materialFrente);
    faceFrente.position.z = ESPESSURA / 2;
    const faceVerso = new Mesh(geoVerso, materialVerso);
    faceVerso.position.z = -ESPESSURA / 2;
    const peca = new Group();
    peca.add(new Mesh(geoBorda, [semTampa, materialBorda]), faceFrente, faceVerso);
    return peca;
  };

  const xp = -LARGURA / 2 + LARGURA * POSICAO_PERFURACAO;
  const [formaCorpo, formaCanhoto] = criarFormas();
  // Pivô de cada peça na linha da perfuração: no rasgo, cada parte gira em volta
  // do ponto em que se solta, como papel de verdade.
  const pivoCorpo = new Group();
  const pivoCanhoto = new Group();
  for (const [pivo, forma] of [[pivoCorpo, formaCorpo], [pivoCanhoto, formaCanhoto]] as const) {
    const peca = montarPeca(forma);
    peca.position.x = -xp;
    pivo.position.x = xp;
    pivo.add(peca);
  }

  // Um grupo por responsabilidade. Cada efeito escreve no seu próprio grupo e
  // nenhum sobrescreve o outro.
  const entrada = new Group();     // animação de chegada
  const pose = new Group();        // pose da parada atual do roteiro
  const inclinacao = new Group();  // ponteiro + flutuação
  const giro = new Group();        // ciclo de virar + arraste + tremor do selo
  giro.add(pivoCorpo, pivoCanhoto);
  inclinacao.add(giro);
  pose.add(inclinacao);
  entrada.add(pose);
  cena.add(entrada);

  // ------------------------------------------------------------- enquadrar
  let larguraTela = 1;
  let alturaTela = 1;
  /** Largura, em px CSS, do ingresso de frente com o canvas em escala 1. */
  let larguraIngressoPx = 1;

  const enquadrar = () => {
    const caixa = ancoraHero.getBoundingClientRect();
    if (!caixa.width || !caixa.height) return;
    larguraTela = Math.round(caixa.width * AMPLIA_CANVAS);
    alturaTela = Math.round(caixa.height * AMPLIA_CANVAS);
    renderer.setSize(larguraTela, alturaTela);
    camera.aspect = larguraTela / alturaTela;
    // Distância mínima para o ingresso caber inteiro com a folga nas duas direções.
    const tangente = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const pelaLargura = ((LARGURA / 2) * FOLGA) / (tangente * camera.aspect);
    const pelaAltura = 1.12 * 1.25 / tangente;
    camera.position.z = Math.max(pelaLargura, pelaAltura);
    camera.updateProjectionMatrix();
    const meiaLarguraVisivel = camera.position.z * tangente * camera.aspect;
    larguraIngressoPx = (larguraTela * LARGURA) / (2 * meiaLarguraVisivel);
  };
  enquadrar();
  const observadorTamanho = new ResizeObserver(enquadrar);
  observadorTamanho.observe(ancoraHero);

  // ------------------------------------------------------------- movimento
  /** Rotação em Y de três fontes independentes, e o tremor do selo em Z. */
  const estado = { ciclo: 0, arraste: 0, chegada: 0, visibilidade: 0, tremor: 0 };
  /** Inclinação pedida pelo ponteiro, suavizada; a cena aplica proporcional à "vida". */
  const ponteiroSuave = { x: 0, y: 0 };

  // Segura a frente, vira para o verso, segura, volta. Sempre no mesmo sentido:
  // 0 → π → 2π, e 2π é a mesma pose de 0, então a repetição não tem emenda.
  const ciclo = gsap.timeline({ repeat: -1, paused: true })
    .to(estado, { ciclo: Math.PI, duration: 1.7, ease: 'power3.inOut', delay: 3.8 })
    .to(estado, { ciclo: Math.PI * 2, duration: 1.7, ease: 'power3.inOut', delay: 2.6 });

  const dica = raiz.querySelector<HTMLElement>('[data-dica]');
  const dicaRolagem = raiz.querySelector<HTMLElement>('[data-dica-rolagem]');

  let animacaoEntrada: gsap.core.Timeline | undefined;
  if (reduzido) {
    // Sem movimento automático: uma pose fixa que ainda mostra que é um objeto.
    // Positivo afasta o canhoto da câmera, e o ingresso inteiro cabe no quadro.
    estado.ciclo = 0.38;
    estado.visibilidade = 1;
    if (dica) gsap.set(dica, { opacity: 1 });
  } else {
    animacaoEntrada = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { ciclo.play(); } })
      .to(estado, { visibilidade: 1, duration: 0.6, ease: 'power1.out' }, 0)
      .fromTo(entrada.position, { y: -0.9 }, { y: 0, duration: 1.9 }, 0)
      .fromTo(entrada.scale, { x: 0.82, y: 0.82, z: 0.82 }, { x: 1, y: 1, z: 1, duration: 1.9 }, 0)
      .fromTo(estado, { chegada: -Math.PI * 2.25 }, { chegada: 0, duration: 2.4 }, 0);
    if (dica) animacaoEntrada.to(dica, { opacity: 1, duration: 0.8, ease: 'power1.out' }, 1.6);
  }

  // ----------------------------------------------------- ponteiro (mouse)
  // Só com mouse: no toque, o "ponteiro" é o dedo rolando a página, e o
  // ingresso inclinaria a cada rolagem.
  const comMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const irX = gsap.quickTo(ponteiroSuave, 'x', { duration: 0.9, ease: 'power3.out' });
  const irY = gsap.quickTo(ponteiroSuave, 'y', { duration: 0.9, ease: 'power3.out' });
  const aoMoverMouse = (e: PointerEvent) => {
    if (arrastando) return;
    irX(((e.clientY / window.innerHeight) * 2 - 1) * INCLINACAO_PONTEIRO.x);
    irY(((e.clientX / window.innerWidth) * 2 - 1) * INCLINACAO_PONTEIRO.y);
  };
  if (comMouse && !reduzido) {
    window.addEventListener('pointermove', aoMoverMouse, { passive: true });
  }

  // ------------------------------------------------------------- arraste
  // O canvas não recebe ponteiro (fica por cima da página inteira); quem recebe
  // o arraste é a âncora do hero, no lugar exato em que o ingresso aparece.
  let arrastando = false;
  let ponteiro = -1;
  let xAnterior = 0;
  let tAnterior = 0;
  let velocidade = 0; // radianos por ms
  let retomar: gsap.core.Tween | undefined;
  let cicloAtual = 1;
  ancoraHero.style.cursor = 'grab';
  ancoraHero.style.touchAction = 'pan-y';

  const aoPressionar = (e: PointerEvent) => {
    // Um dedo só, e só enquanto o ingresso está no hero.
    if (arrastando || cicloAtual < 0.5) return;
    arrastando = true;
    ponteiro = e.pointerId;
    ancoraHero.setPointerCapture(e.pointerId);
    ancoraHero.style.cursor = 'grabbing';
    xAnterior = e.clientX;
    tAnterior = performance.now();
    velocidade = 0;

    retomar?.kill();
    gsap.killTweensOf(estado, 'arraste');
    // Quem já arrastou aprendeu o gesto: a dica sai e não volta.
    if (dica) {
      gsap.killTweensOf(dica);
      gsap.to(dica, { opacity: 0, duration: 0.3, ease: 'power1.out' });
    }
    ciclo.pause();
    // Leve afundada ao pegar: o objeto responde ao toque antes de se mover.
    gsap.to(giro.scale, { x: 0.97, y: 0.97, z: 0.97, duration: 0.16, ease: 'power2.out' });
  };

  const aoArrastar = (e: PointerEvent) => {
    if (!arrastando || e.pointerId !== ponteiro) return;
    const agora = performance.now();
    // Arrastar a largura inteira do hero dá pouco mais de meia volta.
    const radianos = (e.clientX - xAnterior) * ((Math.PI * 1.2) / Math.max(ancoraHero.clientWidth, 1));
    estado.arraste += radianos;
    velocidade = radianos / Math.max(agora - tAnterior, 1);
    xAnterior = e.clientX;
    tAnterior = agora;
  };

  const aoSoltar = (e: PointerEvent) => {
    if (!arrastando || e.pointerId !== ponteiro) return;
    arrastando = false;
    ponteiro = -1;
    ancoraHero.style.cursor = 'grab';
    gsap.to(giro.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2)' });

    // Inércia: projeta onde o giro pararia sozinho e encaixa na face mais
    // próxima. Um peteleco rápido vira o ingresso sem precisar arrastar muito.
    // Com movimento reduzido o encaixe preserva a pose inclinada de repouso.
    const projetado = estado.arraste + velocidade * 380;
    const alvo = reduzido
      ? Math.round(projetado / Math.PI) * Math.PI
      : Math.round((estado.ciclo + projetado) / Math.PI) * Math.PI - estado.ciclo;
    gsap.to(estado, {
      arraste: alvo,
      duration: 1.1 + Math.min(Math.abs(velocidade) * 60, 0.8),
      ease: 'power3.out',
      onComplete: () => {
        // Deixa a face escolhida à vista um pouco antes de o ciclo voltar.
        if (!reduzido) retomar = gsap.delayedCall(2.2, () => { ciclo.resume(); });
      },
    });
  };

  ancoraHero.addEventListener('pointerdown', aoPressionar);
  ancoraHero.addEventListener('pointermove', aoArrastar);
  ancoraHero.addEventListener('pointerup', aoSoltar);
  ancoraHero.addEventListener('pointercancel', aoSoltar);

  // ------------------------------------------------- selo e demonstração
  // A demonstração da assinatura, mais abaixo na home, avisa por evento quando
  // confere uma assinatura. Adulterada, o selo do ingresso acende e ele treme.
  const aoConferirAssinatura = (e: Event) => {
    const valida = (e as CustomEvent<{ valida: boolean }>).detail?.valida ?? true;
    gsap.to(materialFrente, {
      emissiveIntensity: valida ? 0 : 1.6,
      duration: valida ? 0.45 : 0.2,
      ease: 'power2.out',
    });
    if (!valida && !reduzido) {
      gsap.fromTo(estado, { tremor: 0.09 }, { tremor: 0, duration: 0.9, ease: 'elastic.out(1.2, 0.2)' });
    }
  };
  window.addEventListener('canhoto:assinatura', aoConferirAssinatura);

  // ------------------------------------------------------------- roteiro
  const momento: Momento = {
    cx: 0, cy: 0, largura: 0, poseX: 0, poseY: 0, poseZ: 0, vida: 1, ciclo: 1, opacidade: 1, rasgo: 0,
  };
  const momentos = new Array<number>(roteiro.length).fill(0);
  const caixas = new Array<DOMRect | null>(roteiro.length).fill(null);

  /** Rolagem em que o ingresso está exatamente na parada i. */
  const quando = (i: number, rolagem: number, janela: number): number => {
    const q = roteiro[i].quando;
    if (q.tipo === 'topo') return 0;
    if (q.tipo === 'centro') {
      const c = caixas[i];
      return c && c.width ? rolagem + c.top + c.height / 2 - janela / 2 : Number.NaN;
    }
    const secao = secoes.get(q.seletor);
    if (!secao) return Number.NaN;
    const s = secao.getBoundingClientRect();
    return rolagem + s.top + q.fracao * Math.max(s.height - janela, 0);
  };

  /** A caixa que o ingresso ocupa dentro da âncora: centrada, na proporção dele. */
  const caixaDoIngresso = (c: DOMRect, preenche: number) => {
    const largura = Math.min(c.width * preenche, c.height * preenche * (LARGURA / ALTURA));
    return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, largura };
  };

  const calcular = (): boolean => {
    const rolagem = window.scrollY;
    const janela = window.innerHeight;
    const rolagemMaxima = Math.max(document.documentElement.scrollHeight - janela, 0);

    for (let i = 0; i < roteiro.length; i++) {
      caixas[i] = ancoras[i]?.getBoundingClientRect() ?? null;
    }
    // Paradas que dependem de âncora invisível (display: none no celular)
    // herdam o momento da anterior; e a ordem nunca anda para trás.
    for (let i = 0; i < roteiro.length; i++) {
      let m = quando(i, rolagem, janela);
      if (Number.isNaN(m)) m = i > 0 ? momentos[i - 1] : 0;
      m = Math.min(m, rolagemMaxima);
      momentos[i] = i > 0 ? Math.max(m, momentos[i - 1] + 1) : m;
    }

    let i = 0;
    while (i < roteiro.length - 1 && momentos[i + 1] <= rolagem) i++;
    const j = Math.min(i + 1, roteiro.length - 1);
    const t = i === j ? 0 : limitar((rolagem - momentos[i]) / (momentos[j] - momentos[i]));

    const a = roteiro[i];
    const b = roteiro[j];
    const ca = caixas[i];
    const cb = caixas[j];
    const aVisivel = !!ca && ca.width > 0;
    const bVisivel = !!cb && cb.width > 0;
    if (!aVisivel && !bVisivel) return false;

    // Âncora escondida empresta a caixa da vizinha e manda o ingresso sumir.
    const ia = caixaDoIngresso(aVisivel ? ca! : cb!, a.preenche ?? 0.9);
    const ib = caixaDoIngresso(bVisivel ? cb! : ca!, b.preenche ?? 0.9);
    const opA = aVisivel ? (a.opacidade ?? 1) : 0;
    const opB = bVisivel ? (b.opacidade ?? 1) : 0;

    const e = suave(t);
    momento.cx = mix(ia.cx, ib.cx, e);
    momento.cy = mix(ia.cy, ib.cy, e);
    momento.largura = mix(ia.largura, ib.largura, e);
    momento.poseX = mix(a.pose?.x ?? 0, b.pose?.x ?? 0, e);
    momento.poseY = mix(a.pose?.y ?? 0, b.pose?.y ?? 0, e);
    momento.poseZ = mix(a.pose?.z ?? 0, b.pose?.z ?? 0, e);
    momento.vida = mix(a.vida ?? 0, b.vida ?? 0, e);
    momento.ciclo = mix(a.ciclo ?? 0, b.ciclo ?? 0, e);
    // Aparecer acontece na segunda metade do trecho, sumir na primeira: o
    // ingresso não fica meio transparente flutuando por cima do conteúdo.
    momento.opacidade = mix(opA, opB, suave(opB > opA ? limitar((t - 0.5) / 0.5) : limitar(t / 0.5)));
    // O rasgo também acontece só no fim da chegada: inteiro durante a viagem.
    const ra = a.rasgo ?? 0;
    const rb = b.rasgo ?? 0;
    momento.rasgo = mix(ra, rb, suave(rb > ra ? limitar((t - 0.5) / 0.5) : t));
    return true;
  };

  // -------------------------------------------------------------- quadro
  let opacidadeAplicada = -1;
  let dicaAplicada = -1;

  const quadro = (tempo: number) => {
    if (!calcular()) {
      if (opacidadeAplicada !== 0) {
        tela.style.opacity = '0';
        opacidadeAplicada = 0;
      }
      return;
    }

    cicloAtual = momento.ciclo;
    const opacidade = momento.opacidade * estado.visibilidade;
    if (Math.abs(opacidade - opacidadeAplicada) > 0.002) {
      tela.style.opacity = opacidade.toFixed(3);
      opacidadeAplicada = opacidade;
    }
    if (dicaRolagem && Math.abs(momento.ciclo - dicaAplicada) > 0.01) {
      dicaRolagem.style.opacity = limitar((momento.ciclo - 0.6) / 0.4).toFixed(2);
      dicaAplicada = momento.ciclo;
    }

    // Fora da tela ou transparente: não desenha nada.
    const janela = window.innerHeight;
    const escala = momento.largura / larguraIngressoPx;
    const meiaAltura = (alturaTela * escala) / 2;
    if (opacidade < 0.01 || momento.cy + meiaAltura < 0 || momento.cy - meiaAltura > janela) return;

    const x = momento.cx - (larguraTela * escala) / 2;
    const y = momento.cy - (alturaTela * escala) / 2;
    tela.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${escala.toFixed(4)})`;

    pose.rotation.set(momento.poseX, momento.poseY, momento.poseZ);

    // Balanço, flutuação e inclinação pelo ponteiro, na medida da "vida" da parada.
    const vida = reduzido ? 0 : momento.vida;
    inclinacao.rotation.x = ponteiroSuave.x * vida;
    inclinacao.rotation.y = ponteiroSuave.y * vida;
    inclinacao.position.y = Math.sin(tempo * 1.1) * 0.05 * vida;
    const balanco = Math.sin(tempo * 0.7) * 0.14 * vida;
    giro.rotation.y = (estado.ciclo + estado.arraste) * momento.ciclo + estado.chegada + balanco;
    giro.rotation.z = estado.tremor;

    aplicarRasgo(momento.rasgo);
    renderer.render(cena, camera);
  };

  const aplicarRasgo = (r: number) => {
    // O canhoto se solta e vem na direção de quem olha; o corpo fica e recua.
    pivoCanhoto.position.set(xp + 0.38 * r, -0.1 * r, 0.32 * r);
    pivoCanhoto.rotation.set(0, -0.3 * r, -0.26 * r);
    pivoCorpo.position.set(xp - 0.3 * r, 0.04 * r, -0.22 * r);
    pivoCorpo.rotation.set(0, 0.12 * r, 0.07 * r);
  };

  gsap.ticker.add(quadro);

  return {
    semWebGL: false,
    destruir() {
      gsap.ticker.remove(quadro);
      ciclo.kill();
      animacaoEntrada?.kill();
      retomar?.kill();
      gsap.killTweensOf([estado, giro.scale, ponteiroSuave, materialFrente, dica]);
      window.removeEventListener('pointermove', aoMoverMouse);
      window.removeEventListener('canhoto:assinatura', aoConferirAssinatura);
      ancoraHero.removeEventListener('pointerdown', aoPressionar);
      ancoraHero.removeEventListener('pointermove', aoArrastar);
      ancoraHero.removeEventListener('pointerup', aoSoltar);
      ancoraHero.removeEventListener('pointercancel', aoSoltar);
      ancoraHero.style.cursor = '';
      ancoraHero.style.touchAction = '';
      observadorTamanho.disconnect();
      descartaveis.forEach((item) => item.dispose());
      renderer.dispose();
      tela.remove();
    },
  };
}

/**
 * O contorno do ingresso em duas peças: o corpo, à esquerda da perfuração, e o
 * canhoto, à direita — com os cantos arredondados, as mordidas na linha do
 * canhoto (as mesmas do .bilhete-deitado) e a borda direita serrilhada da logo.
 *
 * <p>As duas peças dividem a mesma linha de rasgo, um zigue-zague fino entre as
 * duas mordidas: papel picotado não rasga reto, e é justamente por ela que o
 * canhoto se solta no fim da home.
 */
function criarFormas(): [Shape, Shape] {
  const w = LARGURA / 2;
  const h = ALTURA / 2;
  const r = RAIO_CANTO;
  const n = RAIO_RECORTE;
  const xp = -w + LARGURA * POSICAO_PERFURACAO;

  const linhaDoRasgo: Array<[number, number]> = [];
  const passos = 26;
  for (let i = 0; i <= passos; i++) {
    const y = -h + n + (i / passos) * (ALTURA - 2 * n);
    const x = i === 0 || i === passos ? xp : xp + (i % 2 ? 0.012 : -0.012);
    linhaDoRasgo.push([x, y]);
  }

  // Inteiras, as peças se sobrepõem um fio na linha do rasgo. Encostadas
  // exatamente, a rasterização deixava frestas por onde a borda verde de dentro
  // aparecia como uma linha. Na sobreposição as duas mostram o mesmo pedaço da
  // textura (o UV é do ingresso inteiro), então ela não se vê.
  const SOBREPOE = 0.004;
  const miolo = (i: number) => i > 0 && i < linhaDoRasgo.length - 1;

  const corpo = new Shape();
  corpo.moveTo(-w + r, -h);
  corpo.lineTo(xp - n, -h);
  corpo.absarc(xp, -h, n, Math.PI, Math.PI / 2, true);        // metade esquerda da mordida de baixo
  linhaDoRasgo.forEach(([x, y], i) => { if (i > 0) corpo.lineTo(miolo(i) ? x + SOBREPOE : x, y); });
  corpo.absarc(xp, h, n, -Math.PI / 2, -Math.PI, true);       // metade esquerda da mordida de cima
  corpo.lineTo(-w + r, h);
  corpo.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  corpo.lineTo(-w, -h + r);
  corpo.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);

  const canhoto = new Shape();
  canhoto.moveTo(xp, -h + n);
  canhoto.absarc(xp, -h, n, Math.PI / 2, 0, true);            // metade direita da mordida de baixo
  canhoto.lineTo(w - r, -h);
  canhoto.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  const passo = (ALTURA - 2 * r) / DENTES;
  for (let i = 0; i < DENTES; i++) {
    const cy = -h + r + passo * (i + 0.5);
    canhoto.lineTo(w, cy - RAIO_DENTE);
    canhoto.absarc(w, cy, RAIO_DENTE, -Math.PI / 2, Math.PI / 2, true);
  }
  canhoto.lineTo(w, h - r);
  canhoto.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  canhoto.lineTo(xp + n, h);
  canhoto.absarc(xp, h, n, 0, -Math.PI / 2, true);            // metade direita da mordida de cima
  for (let i = linhaDoRasgo.length - 2; i >= 0; i--) {
    const [x, y] = linhaDoRasgo[i];
    canhoto.lineTo(miolo(i) ? x - SOBREPOE : x, y);
  }

  return [corpo, canhoto];
}

/**
 * O ShapeGeometry usa as coordenadas cruas como UV. Aqui elas viram 0..1 sobre
 * o retângulo do ingresso inteiro — nas duas peças —, para a textura continuar
 * exatamente onde estava quando o canhoto se solta.
 * O verso inverte o U: visto de trás, a esquerda da câmera é o +X do objeto.
 */
function mapearUV(geometria: BufferGeometry, espelhar: boolean): BufferGeometry {
  const posicao = geometria.getAttribute('position');
  const uv = geometria.getAttribute('uv');
  for (let i = 0; i < posicao.count; i++) {
    const u = (posicao.getX(i) + LARGURA / 2) / LARGURA;
    const v = (posicao.getY(i) + ALTURA / 2) / ALTURA;
    uv.setXY(i, espelhar ? 1 - u : u, v);
  }
  uv.needsUpdate = true;
  return geometria;
}

function montarSemWebGL(ancora: HTMLElement, frente: HTMLCanvasElement): CenaIngresso {
  frente.style.cssText =
    'position:absolute;inset:0;margin:auto;width:88%;height:auto;transform:rotate(-5deg);border-radius:10px';
  ancora.appendChild(frente);
  return { semWebGL: true, destruir: () => frente.remove() };
}

function limitar(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Suaviza o começo e o fim de cada trecho (smoothstep). */
function suave(t: number): number {
  return t * t * (3 - 2 * t);
}
