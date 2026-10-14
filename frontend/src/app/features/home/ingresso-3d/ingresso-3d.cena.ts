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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ALTURA,
  LARGURA,
  POSICAO_PERFURACAO,
  carregarFontes,
  desenharFrente,
  desenharMapaEspessura,
  desenharMapaMaterial,
  desenharVerso,
} from './ingresso-3d.texturas';

/**
 * A cena do ingresso 3D do hero.
 *
 * <p>Este arquivo é carregado sob demanda (import dinâmico no componente), então
 * o Three.js — de longe a maior dependência do front — só é baixado por quem
 * abre a home, e depois que a página já está na tela.
 *
 * <p>Nada aqui passa pelo Angular: o componente chama {@link montarCena} fora da
 * zona. Um loop de 60 quadros por segundo dentro da zona dispararia detecção de
 * mudanças na aplicação inteira a cada quadro.
 */

gsap.registerPlugin(ScrollTrigger);

const ESPESSURA = 0.04;
const RAIO_CANTO = 0.08;
const RAIO_RECORTE = 0.13;
const DENTES = 6;
const RAIO_DENTE = 0.045;

/** Inclinação de repouso: o ingresso nunca fica chapado de frente para a câmera. */
const POSE = { x: -0.1, z: 0.09 };

/** Quanto a rotação acompanha o ponteiro, em radianos, de uma borda à outra da tela. */
const INCLINACAO_PONTEIRO = { x: 0.22, y: 0.32 };

export interface OpcoesCena {
  readonly movimentoReduzido: boolean;
}

export interface CenaIngresso {
  destruir(): void;
}

export async function montarCena(host: HTMLElement, opcoes: OpcoesCena): Promise<CenaIngresso> {
  await carregarFontes();
  const frente = desenharFrente();

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    // Sem WebGL (navegador antigo, GPU bloqueada): o ingresso vira imagem chapada.
    return montarSemWebGL(host, frente);
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
  tela.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;opacity:0';
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
  const forma = criarForma();
  const geoFrente = guardar(mapearUV(new ShapeGeometry(forma, 24), false));
  const geoVerso = guardar(mapearUV(new ShapeGeometry(forma, 24), true));
  const geoCorpo = guardar(new ExtrudeGeometry(forma, { depth: ESPESSURA, bevelEnabled: false, curveSegments: 24 }));
  geoCorpo.translate(0, 0, -ESPESSURA / 2);

  const faceFrente = new Mesh(geoFrente, materialFrente);
  faceFrente.position.z = ESPESSURA / 2;
  const faceVerso = new Mesh(geoVerso, materialVerso);
  faceVerso.position.z = -ESPESSURA / 2;
  const corpo = new Mesh(geoCorpo, [semTampa, materialBorda]);

  // Um grupo por responsabilidade. Cada efeito escreve no seu próprio grupo e
  // nenhum sobrescreve o outro: a rolagem não apaga a entrada, o ponteiro não
  // apaga a flutuação.
  const rolagem = new Group();     // ScrollTrigger
  const entrada = new Group();     // animação de chegada
  const inclinacao = new Group();  // pose + ponteiro + flutuação
  const giro = new Group();        // ciclo de virar + arraste
  giro.add(corpo, faceFrente, faceVerso);
  inclinacao.add(giro);
  entrada.add(inclinacao);
  rolagem.add(entrada);
  cena.add(rolagem);
  inclinacao.rotation.set(POSE.x, 0, POSE.z);

  // ------------------------------------------------------------- enquadrar
  const enquadrar = () => {
    const largura = host.clientWidth;
    const altura = host.clientHeight;
    if (!largura || !altura) return;
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    // Distância mínima para o ingresso caber inteiro, com folga para a
    // perspectiva do giro e para a inclinação, nas duas direções.
    const tangente = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const pelaLargura = (LARGURA / 2) * 1.1 / (tangente * camera.aspect);
    const pelaAltura = 1.12 / tangente;
    camera.position.z = Math.max(pelaLargura, pelaAltura);
    camera.updateProjectionMatrix();
  };
  enquadrar();
  const observadorTamanho = new ResizeObserver(enquadrar);
  observadorTamanho.observe(host);

  // ------------------------------------------------------------- movimento
  /** Rotação em Y, somada de três fontes independentes. */
  const estado = { ciclo: 0, arraste: 0, chegada: 0 };

  // Segura a frente, vira para o verso, segura, volta. Sempre no mesmo sentido:
  // 0 → π → 2π, e 2π é a mesma pose de 0, então a repetição não tem emenda.
  const ciclo = gsap.timeline({ repeat: -1, paused: true })
    .to(estado, { ciclo: Math.PI, duration: 1.7, ease: 'power3.inOut', delay: 3.8 })
    .to(estado, { ciclo: Math.PI * 2, duration: 1.7, ease: 'power3.inOut', delay: 2.6 });

  const dica = host.querySelector<HTMLElement>('[data-dica]');
  const dicaRolagem = host.querySelector<HTMLElement>('[data-dica-rolagem]');

  let animacaoEntrada: gsap.core.Timeline | undefined;
  if (reduzido) {
    // Sem movimento automático: uma pose fixa que ainda mostra que é um objeto.
    // Positivo afasta o canhoto da câmera, e o ingresso inteiro cabe no quadro.
    estado.ciclo = 0.38;
    gsap.set([tela, dica], { opacity: 1 });
  } else {
    animacaoEntrada = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { ciclo.play(); } })
      .to(tela, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 0)
      .fromTo(entrada.position, { y: -0.9 }, { y: 0, duration: 1.9 }, 0)
      .fromTo(entrada.scale, { x: 0.82, y: 0.82, z: 0.82 }, { x: 1, y: 1, z: 1, duration: 1.9 }, 0)
      .fromTo(estado, { chegada: -Math.PI * 2.25 }, { chegada: 0, duration: 2.4 }, 0)
      .to(dica, { opacity: 1, duration: 0.8, ease: 'power1.out' }, 1.6);
  }

  // Ao rolar para fora do hero, o ingresso deita para trás e fica para trás.
  const animacaoRolagem = reduzido ? undefined : gsap.timeline({
    scrollTrigger: {
      trigger: host.closest('section') ?? host,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
    },
  })
    .to(rolagem.rotation, { x: -0.55, ease: 'none', duration: 1 }, 0)
    .to(rolagem.position, { y: -0.4, ease: 'none', duration: 1 }, 0)
    // A dica some logo no começo da rolagem, antes de o ingresso descer sobre ela.
    .fromTo(dicaRolagem, { opacity: 1 }, { opacity: 0, ease: 'none', duration: 0.15 }, 0);

  // ----------------------------------------------------- ponteiro (mouse)
  // Só com mouse: no toque, o "ponteiro" é o dedo rolando a página, e o
  // ingresso inclinaria a cada rolagem.
  const comMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const irX = gsap.quickTo(inclinacao.rotation, 'x', { duration: 0.9, ease: 'power3.out' });
  const irY = gsap.quickTo(inclinacao.rotation, 'y', { duration: 0.9, ease: 'power3.out' });
  const aoMoverMouse = (e: PointerEvent) => {
    if (!visivel || arrastando) return;
    const px = (e.clientX / window.innerWidth) * 2 - 1;
    const py = (e.clientY / window.innerHeight) * 2 - 1;
    irX(POSE.x + py * INCLINACAO_PONTEIRO.x);
    irY(px * INCLINACAO_PONTEIRO.y);
  };
  if (comMouse && !reduzido) {
    window.addEventListener('pointermove', aoMoverMouse, { passive: true });
  }

  // ------------------------------------------------------------- arraste
  let arrastando = false;
  let ponteiro = -1;
  let xAnterior = 0;
  let tAnterior = 0;
  let velocidade = 0; // radianos por ms
  let retomar: gsap.core.Tween | undefined;

  const aoPressionar = (e: PointerEvent) => {
    // Um dedo só: um segundo toque no meio do arraste faria o ingresso pular.
    if (arrastando) return;
    arrastando = true;
    ponteiro = e.pointerId;
    tela.setPointerCapture(e.pointerId);
    tela.style.cursor = 'grabbing';
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
    // Arrastar a largura inteira do quadro dá pouco mais de meia volta.
    const radianos = (e.clientX - xAnterior) * ((Math.PI * 1.2) / Math.max(host.clientWidth, 1));
    estado.arraste += radianos;
    velocidade = radianos / Math.max(agora - tAnterior, 1);
    xAnterior = e.clientX;
    tAnterior = agora;
  };

  const aoSoltar = (e: PointerEvent) => {
    if (!arrastando || e.pointerId !== ponteiro) return;
    arrastando = false;
    ponteiro = -1;
    tela.style.cursor = 'grab';
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

  tela.addEventListener('pointerdown', aoPressionar);
  tela.addEventListener('pointermove', aoArrastar);
  tela.addEventListener('pointerup', aoSoltar);
  tela.addEventListener('pointercancel', aoSoltar);

  // -------------------------------------------------------------- quadro
  // Fora da tela ou com a aba escondida, não desenha nada.
  let visivel = true;
  const observadorVisao = new IntersectionObserver(([registro]) => {
    visivel = registro.isIntersecting;
  });
  observadorVisao.observe(host);

  const quadro = (tempo: number) => {
    if (!visivel) return;
    // Balanço e flutuação ociosos: o ingresso parece suspenso, não congelado.
    const balanco = reduzido ? 0 : Math.sin(tempo * 0.7) * 0.14;
    inclinacao.position.y = reduzido ? 0 : Math.sin(tempo * 1.1) * 0.05;
    giro.rotation.y = estado.ciclo + estado.arraste + estado.chegada + balanco;
    renderer.render(cena, camera);
  };
  gsap.ticker.add(quadro);

  return {
    destruir() {
      gsap.ticker.remove(quadro);
      ciclo.kill();
      animacaoEntrada?.kill();
      animacaoRolagem?.scrollTrigger?.kill();
      animacaoRolagem?.kill();
      retomar?.kill();
      gsap.killTweensOf([estado, giro.scale, inclinacao.rotation, tela, dica, dicaRolagem]);
      window.removeEventListener('pointermove', aoMoverMouse);
      observadorTamanho.disconnect();
      observadorVisao.disconnect();
      descartaveis.forEach((item) => item.dispose());
      renderer.dispose();
      tela.remove();
    },
  };
}

/**
 * O contorno do ingresso: cantos arredondados, as duas mordidas na linha do
 * canhoto (as mesmas do .bilhete-deitado) e a borda direita serrilhada, como na
 * logo.
 */
function criarForma(): Shape {
  const w = LARGURA / 2;
  const h = ALTURA / 2;
  const r = RAIO_CANTO;
  const n = RAIO_RECORTE;
  const xp = -w + LARGURA * POSICAO_PERFURACAO;
  const forma = new Shape();

  forma.moveTo(-w + r, -h);
  forma.lineTo(xp - n, -h);
  forma.absarc(xp, -h, n, Math.PI, 0, true);           // mordida de baixo
  forma.lineTo(w - r, -h);
  forma.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);

  const passo = (ALTURA - 2 * r) / DENTES;
  for (let i = 0; i < DENTES; i++) {
    const cy = -h + r + passo * (i + 0.5);
    forma.lineTo(w, cy - RAIO_DENTE);
    forma.absarc(w, cy, RAIO_DENTE, -Math.PI / 2, Math.PI / 2, true);
  }

  forma.lineTo(w, h - r);
  forma.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  forma.lineTo(xp + n, h);
  forma.absarc(xp, h, n, 0, Math.PI, true);            // mordida de cima
  forma.lineTo(-w + r, h);
  forma.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  forma.lineTo(-w, -h + r);
  forma.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  return forma;
}

/**
 * O ShapeGeometry usa as coordenadas cruas como UV. Aqui elas viram 0..1 sobre
 * o retângulo do ingresso, para a textura cobrir a face exatamente uma vez.
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

function montarSemWebGL(host: HTMLElement, frente: HTMLCanvasElement): CenaIngresso {
  frente.style.cssText =
    'position:absolute;inset:0;margin:auto;width:88%;height:auto;transform:rotate(-5deg);border-radius:10px';
  host.appendChild(frente);
  return { destruir: () => frente.remove() };
}
