import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { svgDoIngresso } from '../ingresso-3d/ingresso-3d.texturas';

/**
 * O que aparece dentro da janela. Com {@code video}, o show fica em movimento
 * (sem som, em loop, só tocando com a seção perto da tela); sem ele, a foto.
 * O poster é o primeiro quadro do vídeo — a foto que aparece enquanto ele
 * carrega e no lugar dele com movimento reduzido.
 *
 * Para trocar: veja "Seção de vídeo" em docs/redesign-visual.md (formato e o
 * comando do ffmpeg que gera o .mp4 e o poster a partir do arquivo bruto).
 */
const MIDIA: { readonly video: string | null; readonly poster: string } = {
  video: 'janela-show.mp4',
  poster: 'janela-show.jpg',
};

/** Trechos da rolagem pela seção, de 0 (topo grudou) a 1 (fim do trecho grudado). */
const FASES = {
  /** O ingresso 3D some por cima da janela (o roteiro da home usa o mesmo valor). */
  trocaAte: 0.1,
  /** A janela cresce até a foto cobrir a tela. */
  cresceAte: 0.66,
  /** O texto sobe. */
  textoDe: 0.6,
  textoAte: 0.8,
};

/**
 * A janela para o show: a foto da plateia aparece recortada no formato do
 * ingresso e, conforme a pessoa rola, o recorte cresce até a foto tomar a tela
 * de ponta a ponta — o ingresso abrindo a porta do show.
 *
 * <p>A seção é alta e o conteúdo fica grudado (sticky) enquanto se rola por ela;
 * o progresso dentro desse trecho comanda a máscara. É CSS {@code mask-image}
 * com o mesmo contorno da geometria 3D, então o ingresso que chega voando
 * encaixa exatamente na janela antes de sumir.
 *
 * <p>Com movimento reduzido a seção é baixa e estática: foto inteira e texto à vista.
 */
@Component({
  selector: 'app-janela-show',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="janela" #secao class="relative bg-tinta-900" [class]="reduzido ? 'h-[85svh]' : 'h-[280vh]'">
      <div class="sticky top-0 h-[100svh] overflow-hidden">
        <!--
          Duas camadas de propósito: a máscara fica na moldura, parada, e o zoom
          só na foto lá dentro. Na mesma camada, o scale levaria a máscara junto e
          a janela sairia maior que o ingresso e fora do lugar.
          A origem do zoom fica no palco: é o que aparece primeiro dentro da janela.
        -->
        <div #moldura class="absolute inset-0" [style.opacity]="reduzido ? 1 : 0">
          @if (midia.video && !reduzido) {
            <!-- [muted] como propriedade: o atributo sozinho, criado pelo Angular
                 depois do parse, não deixa o vídeo mudo e o navegador bloqueia o play. -->
            <video #foto [muted]="true" muted loop playsinline preload="none" [poster]="midia.poster"
                   aria-hidden="true" class="w-full h-full object-cover origin-[66%_40%]">
              <source [src]="midia.video" type="video/mp4" />
            </video>
          } @else {
            <img #foto [src]="midia.poster" loading="eager" decoding="async"
                 alt="Plateia de um show com as mãos para o alto, sob refletores verdes"
                 class="w-full h-full object-cover origin-[66%_40%]" />
          }
        </div>

        <!-- Onde o ingresso 3D pousa antes de virar janela: mesmo tamanho do recorte inicial. -->
        <div data-ancora="janela" #ancora aria-hidden="true"
             class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none
                    w-[78vw] sm:w-[60vw] lg:w-[38vw] max-w-[34rem] aspect-[340/150]"></div>

        <!-- Véu da base: o texto em papel sobre a foto precisa de fundo escuro para ter contraste. -->
        <div #veu aria-hidden="true"
             class="absolute inset-0 bg-gradient-to-t from-tinta-900/95 via-tinta-900/35 to-transparent"
             [style.opacity]="reduzido ? 1 : 0"></div>

        <!-- Texto embaixo, sobre a plateia em silhueta, que é a parte mais escura do vídeo. -->
        <div #texto class="absolute inset-x-0 bottom-0" [style.opacity]="reduzido ? 1 : 0">
          <div class="max-w-6xl mx-auto px-6 pb-14 md:pb-20">
            <div class="max-w-xl">
              <h2 class="text-titulo-xl font-semibold text-papel-50 mb-7">
                Daqui para frente,<br />
                é só show.
              </h2>
              <a routerLink="/events" class="btn-principal">Ver eventos em cartaz</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class JanelaShowComponent implements OnDestroy {

  readonly midia = MIDIA;

  readonly reduzido = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly zona = inject(NgZone);
  private readonly secao = viewChild.required<ElementRef<HTMLElement>>('secao');
  private readonly moldura = viewChild.required<ElementRef<HTMLElement>>('moldura');
  /** A foto ou o vídeo: o zoom de entrada vale para os dois. */
  private readonly foto = viewChild.required<ElementRef<HTMLImageElement | HTMLVideoElement>>('foto');
  private readonly ancora = viewChild.required<ElementRef<HTMLElement>>('ancora');
  private readonly veu = viewChild.required<ElementRef<HTMLElement>>('veu');
  private readonly texto = viewChild.required<ElementRef<HTMLElement>>('texto');

  private desmontar?: () => void;

  constructor() {
    afterNextRender(() => {
      if (this.reduzido) return;
      this.zona.runOutsideAngular(() => this.montar());
    });
  }

  ngOnDestroy(): void {
    this.desmontar?.();
  }

  private montar(): void {
    const secao = this.secao().nativeElement;
    const moldura = this.moldura().nativeElement;
    const foto = this.foto().nativeElement;
    const ancora = this.ancora().nativeElement;
    const veu = this.veu().nativeElement;
    const texto = this.texto().nativeElement;

    const mascara = `url("data:image/svg+xml,${encodeURIComponent(svgDoIngresso())}")`;
    const estilo = moldura.style;
    estilo.setProperty('-webkit-mask-repeat', 'no-repeat');
    estilo.setProperty('mask-repeat', 'no-repeat');
    estilo.setProperty('-webkit-mask-position', 'center');
    estilo.setProperty('mask-position', 'center');
    let comMascara = false;
    const mascarar = (ligar: boolean) => {
      if (ligar === comMascara) return;
      comMascara = ligar;
      estilo.setProperty('-webkit-mask-image', ligar ? mascara : 'none');
      estilo.setProperty('mask-image', ligar ? mascara : 'none');
    };
    mascarar(true);

    const atualizar = () => {
      const caixa = secao.getBoundingClientRect();
      const janela = window.innerHeight;
      const largura = window.innerWidth;
      const p = limitar(-caixa.top / Math.max(caixa.height - janela, 1));

      // Antes de o ingresso 3D pousar, a janela não existe: dois ingressos na
      // tela ao mesmo tempo quebrariam a ilusão de que um vira o outro.
      moldura.style.opacity = caixa.top <= 0 ? '1' : '0';

      // Crescimento geométrico (zoom com velocidade constante): de igual ao
      // ingresso até um tamanho em que o recorte passa das bordas da tela —
      // alto o bastante para as mordidas e a serrilha ficarem de fora.
      const g = suave(limitar((p - FASES.trocaAte) / (FASES.cresceAte - FASES.trocaAte)));
      const inicial = Math.max(ancora.getBoundingClientRect().width, 1);
      const cobre = Math.max(largura * 1.15, janela * 2.9);
      // Coberta a tela, a máscara sai: nada a recortar, nada a calcular.
      mascarar(g < 0.999);
      if (comMascara) {
        const tamanho = `${(inicial * Math.pow(cobre / inicial, g)).toFixed(1)}px auto`;
        estilo.setProperty('-webkit-mask-size', tamanho);
        estilo.setProperty('mask-size', tamanho);
      }
      // A foto assenta enquanto a janela abre: começa ampliada e chega a 1.
      foto.style.transform = `scale(${(1.25 - 0.25 * g).toFixed(4)})`;

      const t = suave(limitar((p - FASES.textoDe) / (FASES.textoAte - FASES.textoDe)));
      veu.style.opacity = t.toFixed(3);
      texto.style.opacity = t.toFixed(3);
      texto.style.transform = `translate3d(0, ${((1 - t) * 24).toFixed(1)}px, 0)`;
      // Botão só clicável quando já está à vista.
      texto.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
    };

    // Um cálculo por quadro, só enquanto a seção está perto da tela.
    let visivel = false;
    let agendado = false;
    const agendar = () => {
      if (agendado || !visivel) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        atualizar();
      });
    };
    const observador = new IntersectionObserver(([registro]) => {
      visivel = registro.isIntersecting;
      // O vídeo só toca com a seção por perto: fora dela é bateria gasta à toa.
      if (foto instanceof HTMLVideoElement) {
        if (visivel) {
          foto.preload = 'auto';
          foto.play().catch(() => undefined);
        } else {
          foto.pause();
        }
      }
      agendar();
    }, { rootMargin: '50% 0px' });
    observador.observe(secao);
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar, { passive: true });
    atualizar();

    this.desmontar = () => {
      observador.disconnect();
      window.removeEventListener('scroll', agendar);
      window.removeEventListener('resize', agendar);
    };
  }
}

function limitar(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function suave(t: number): number {
  return t * t * (3 - 2 * t);
}
