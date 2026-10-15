import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject } from '@angular/core';

interface Passo {
  readonly numero: string;
  readonly titulo: string;
  readonly texto: string;
  readonly imagem: string;
  readonly alt: string;
}

const PASSOS: readonly Passo[] = [
  {
    numero: '01',
    titulo: 'Compre pelo celular',
    texto: 'Escolha o setor e reserve. A vaga trava no seu nome por quinze minutos enquanto você paga com Pix ou cartão.',
    imagem: 'passo-comprar.jpg',
    alt: 'Celular exibindo a tela inicial do aplicativo do Canhoto durante um show',
  },
  {
    numero: '02',
    titulo: 'Entre com o canhoto',
    texto: 'Aproxime o QR do leitor na portaria. O código é conferido na hora e vale uma única vez.',
    imagem: 'passo-entrar.jpg',
    alt: 'Totem de portaria exibindo "Ingresso válido" enquanto um ingresso é aproximado do leitor',
  },
  {
    numero: '03',
    titulo: 'Acompanhe as vendas',
    texto: 'Do outro lado, quem organiza vê ocupação por setor, receita e taxa de check-in conforme os ingressos saem.',
    imagem: 'passo-acompanhar.jpg',
    alt: 'Painel do organizador aberto num notebook, com a lista de eventos e os totais de venda',
  },
];

/** Quanto um cartão encolhe e escurece quando o seguinte termina de cobri-lo. */
const ENCOLHE = 0.06;
const ESCURECE = 0.2;

/**
 * "Como funciona": os três passos como ingressos que se empilham ao rolar.
 *
 * <p>O empilhamento é CSS puro — cada item é {@code position: sticky} com um
 * topo um pouco maior que o anterior. Sem JavaScript, os cartões continuam se
 * empilhando; o script só acrescenta profundidade (o de baixo encolhe e
 * escurece) e o trilho de progresso ao lado.
 *
 * <p>As contas são feitas relativas à janela a cada quadro, a partir de uma
 * única leitura de posição da lista. Guardar posições absolutas da página
 * quebraria quando a marquise acima aparece depois da resposta da API e empurra
 * tudo para baixo.
 */
@Component({
  selector: 'app-como-funciona',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="como-funciona" class="border-b border-papel-300 bg-papel-200/60">
      <div class="max-w-6xl mx-auto px-6 py-16 md:py-24 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">

        <div>
          <div class="lg:sticky lg:top-28">
            <h2 class="text-titulo-md font-semibold text-tinta-900 mb-3">Como funciona</h2>
            <p class="text-tinta-600 leading-relaxed mb-10 lg:mb-12 text-pretty">Do celular à portaria em três passos.</p>

            <!--
              Trilho: repete os passos que os cartões já dizem, então fica fora
              do leitor de tela. É só um "você está aqui" visual.
            -->
            <ol class="hidden lg:block relative" aria-hidden="true">
              <span class="perfuracao-vertical absolute left-[15px] top-7 bottom-7"></span>
              <span data-trilho-progresso
                    class="absolute left-[15px] top-7 bottom-7 w-[3px] bg-acento-500 origin-top scale-y-0"></span>
              @for (passo of passos; track passo.numero; let i = $index) {
                <li data-marco [attr.data-feito]="i === 0" [attr.data-atual]="i === 0"
                    class="group relative flex items-center gap-4 py-3">
                  <span class="numero relative grid place-items-center w-[33px] h-[33px] shrink-0 border text-xs font-bold
                               bg-papel-100 border-papel-400 text-tinta-500 transition-colors duration-200
                               group-data-[feito=true]:bg-acento-500 group-data-[feito=true]:border-acento-600
                               group-data-[feito=true]:text-tinta-900">
                    {{ passo.numero }}
                  </span>
                  <span class="text-sm text-tinta-500 transition-colors duration-200
                               group-data-[atual=true]:text-tinta-900 group-data-[atual=true]:font-semibold">
                    {{ passo.titulo }}
                  </span>
                </li>
              }
            </ol>

            <!-- Parada do ingresso 3D que viaja pela home: pequeno, ao lado dos passos.
                 Só no desktop; no celular a coluna não existe e ele some neste trecho. -->
            <div data-ancora="como" aria-hidden="true" class="hidden lg:block mt-10 h-36"></div>
          </div>
        </div>

        <!--
          A pilha. --i sobe o topo de cada cartão um pouco além do anterior: é o
          que deixa a borda dos de baixo aparecendo, como ingressos num maço.
          A margem inferior é o trecho de rolagem que cada passo fica sozinho
          na tela antes de o seguinte chegar.
        -->
        <ol data-pilha>
          @for (passo of passos; track passo.numero; let i = $index) {
            <li class="sticky top-[calc(5rem_+_var(--i)_*_0.75rem)] lg:top-[calc(7rem_+_var(--i)_*_1.5rem)]
                       mb-[18vh] last:mb-0"
                [style.--i]="i">
              <article data-cartao
                       class="bilhete bilhete-passo overflow-hidden flex flex-col md:flex-row md:h-[22rem]
                              border border-papel-300 origin-top"
                       style="--recorte-y: 13rem">
                <img [src]="passo.imagem" [alt]="passo.alt" loading="lazy" decoding="async"
                     class="w-full h-52 md:h-full md:w-[62%] shrink-0 object-cover" />

                <div class="perfuracao md:hidden"></div>
                <div class="perfuracao-vertical hidden md:block"></div>

                <div class="flex-1 flex flex-col p-6 md:p-8">
                  <p class="mb-5"><span class="marcado numero text-base font-bold">{{ passo.numero }}</span></p>
                  <h3 class="text-titulo-md font-semibold text-tinta-900 mb-3 md:mt-auto">{{ passo.titulo }}</h3>
                  <p class="text-[0.9375rem] leading-relaxed text-tinta-600">{{ passo.texto }}</p>
                </div>

                <div data-sombra class="absolute inset-0 bg-tinta-900 opacity-0 pointer-events-none"
                     aria-hidden="true"></div>
              </article>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
})
export class ComoFuncionaComponent implements OnDestroy {

  readonly passos = PASSOS;

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);

  private desmontar?: () => void;

  constructor() {
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => this.montar());
    });
  }

  ngOnDestroy(): void {
    this.desmontar?.();
  }

  private montar(): void {
    const raiz = this.elemento.nativeElement as HTMLElement;
    const lista = raiz.querySelector<HTMLElement>('[data-pilha]');
    if (!lista) return;

    const itens = Array.from(lista.children) as HTMLElement[];
    const cartoes = itens.map((li) => li.querySelector<HTMLElement>('[data-cartao]')!);
    const sombras = itens.map((li) => li.querySelector<HTMLElement>('[data-sombra]')!);
    const marcos = Array.from(raiz.querySelectorAll<HTMLElement>('[data-marco]'));
    const progresso = raiz.querySelector<HTMLElement>('[data-trilho-progresso]');
    // Com movimento reduzido o cartão não encolhe; escurecer e o trilho ficam,
    // porque informam onde a pessoa está e não deslocam nada.
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Posição de cada item dentro da lista como se nada estivesse grudado.
    // offsetTop de um elemento sticky já vem com o deslocamento do sticky, então
    // a posição natural sai da soma das alturas — que o sticky não altera.
    let naturais: number[] = [];
    let topos: number[] = [];
    let alturas: number[] = [];
    const medir = () => {
      let acumulado = 0;
      alturas = itens.map((li) => li.offsetHeight);
      naturais = itens.map((li) => {
        const aqui = acumulado;
        acumulado += li.offsetHeight + parseFloat(getComputedStyle(li).marginBottom);
        return aqui;
      });
      topos = itens.map((li) => parseFloat(getComputedStyle(li).top) || 0);
    };

    const limitar = (v: number) => Math.min(1, Math.max(0, v));

    const atualizar = () => {
      const topoLista = lista.getBoundingClientRect().top;

      // Quanto cada cartão já cobriu o anterior: 0 enquanto ainda não encostou
      // na base dele, 1 quando grudou no próprio lugar. Medir a partir da base
      // (e não da borda da tela) evita escurecer um cartão que nada cobre ainda.
      const chegada = itens.map((_, i) => {
        if (i === 0) return 1;
        const posicao = topoLista + naturais[i];
        const encosta = topos[i - 1] + alturas[i - 1];
        return limitar((encosta - posicao) / Math.max(encosta - topos[i], 1));
      });

      cartoes.forEach((cartao, i) => {
        const cobertura = chegada[i + 1] ?? 0;
        if (!reduzido) {
          cartao.style.transform = cobertura > 0 ? `scale(${(1 - ENCOLHE * cobertura).toFixed(4)})` : '';
        }
        sombras[i].style.opacity = (ESCURECE * cobertura).toFixed(3);
      });

      if (progresso) {
        const ultimo = itens.length - 1;
        const inicio = topoLista + naturais[0] - topos[0];
        const fim = topoLista + naturais[ultimo] - topos[ultimo];
        // inicio e fim são distâncias até grudar; percorre de 0 a 1 entre o
        // primeiro e o último cartão grudarem.
        const fracao = limitar(inicio / Math.min(inicio - fim, -1));
        progresso.style.transform = `scaleY(${fracao.toFixed(4)})`;
      }

      // O passo atual é o último cujo cartão já cobriu mais da metade do anterior.
      const atual = chegada.reduce((ultimoVisto, c, i) => (c >= 0.6 ? i : ultimoVisto), 0);
      marcos.forEach((marco, i) => {
        marco.dataset['feito'] = String(i <= atual);
        marco.dataset['atual'] = String(i === atual);
      });
    };

    // Mesmo esquema da ParalaxeDirective: um cálculo por quadro, só enquanto a
    // seção está na tela.
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
    const aoRedimensionar = () => {
      medir();
      agendar();
    };

    const observadorVisao = new IntersectionObserver(([registro]) => {
      visivel = registro.isIntersecting;
      agendar();
    });
    observadorVisao.observe(raiz);

    const observadorTamanho = new ResizeObserver(aoRedimensionar);
    observadorTamanho.observe(lista);

    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', aoRedimensionar, { passive: true });
    medir();

    this.desmontar = () => {
      observadorVisao.disconnect();
      observadorTamanho.disconnect();
      window.removeEventListener('scroll', agendar);
      window.removeEventListener('resize', aoRedimensionar);
    };
  }
}
