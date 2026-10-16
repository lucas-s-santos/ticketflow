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
/** Quanto um cartão escurece quando o seguinte termina de cobri-lo. */
const ESCURECE = 0.2;

/**
 * "Como funciona": os três passos como ingressos que se empilham ao rolar.
 *
 * <p>O empilhamento é CSS puro — cada item é {@code position: sticky} com um
 * topo um pouco maior que o anterior, e todos têm a mesma altura. Sem
 * JavaScript, os cartões continuam se empilhando; o script só escurece o de
 * baixo e acende os números (trilho no desktop, faixa no celular, e o número
 * de cada cartão) conforme a pessoa avança.
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
              Trilho (desktop): repete os passos que os cartões já dizem, então
              fica fora do leitor de tela. É só um "você está aqui" visual: a
              perfuração enche de verde e os números acendem conforme a rolagem.
            -->
            <ol class="hidden lg:block relative" aria-hidden="true">
              <span class="perfuracao-vertical absolute left-[15px] top-7 bottom-7"></span>
              <span data-progresso="y"
                    class="absolute left-[15px] top-7 bottom-7 w-[3px] bg-acento-500 origin-top scale-y-0"></span>
              @for (passo of passos; track passo.numero; let i = $index) {
                <li [attr.data-passo]="i" [attr.data-feito]="i === 0" [attr.data-atual]="i === 0"
                    class="group relative flex items-center gap-4 py-3">
                  <span class="numero-passo relative">{{ passo.numero }}</span>
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

        <div>
          <!--
            Faixa de progresso (celular e tablet): o mesmo trilho, deitado e
            grudado no topo enquanto os cartões passam. Dentro deste bloco para
            grudar só durante a pilha, não depois dela.
          -->
          <div class="lg:hidden sticky top-16 z-20 -mx-6 px-6 py-3 mb-5 bg-papel-200 border-b border-papel-300"
               aria-hidden="true">
            <ol class="relative flex items-center justify-between max-w-xs">
              <span class="perfuracao absolute left-4 right-4 top-1/2 -translate-y-1/2"></span>
              <span data-progresso="x"
                    class="absolute left-4 right-4 top-1/2 h-[3px] -translate-y-1/2 bg-acento-500 origin-left scale-x-0"></span>
              @for (passo of passos; track passo.numero; let i = $index) {
                <li [attr.data-passo]="i" [attr.data-feito]="i === 0" [attr.data-atual]="i === 0" class="relative">
                  <span class="numero-passo">{{ passo.numero }}</span>
                </li>
              }
            </ol>
          </div>

          <!--
            A pilha. Todos os cartões têm a mesma altura e a mesma largura, e cada
            um gruda um pouco abaixo do anterior (--i): o maço fica alinhado, com
            só a borda de cima dos de trás aparecendo. A margem inferior é o
            trecho de rolagem em que cada passo fica sozinho antes do próximo.
          -->
          <ol data-pilha>
            @for (passo of passos; track passo.numero; let i = $index) {
              <li [attr.data-passo]="i" [attr.data-feito]="i === 0" [attr.data-atual]="i === 0"
                  class="sticky rounded-bilhete mb-[18vh] last:mb-0
                         top-[calc(8rem_+_var(--i)_*_0.75rem)] lg:top-[calc(7rem_+_var(--i)_*_1rem)]"
                  [class.sombra-maco]="i > 0"
                  [style.--i]="i">
                <article data-cartao
                         class="bilhete bilhete-passo overflow-hidden flex flex-col h-[25rem] md:h-[22rem] md:flex-row
                                border border-papel-300"
                         style="--recorte-y: 10rem">
                  <img [src]="passo.imagem" [alt]="passo.alt" loading="lazy" decoding="async"
                       class="w-full h-40 md:h-full md:w-[62%] shrink-0 object-cover" />

                  <div class="perfuracao md:hidden"></div>
                  <div class="perfuracao-vertical hidden md:block"></div>

                  <div class="flex-1 min-h-0 flex flex-col p-6 md:p-8">
                    <p class="mb-4 md:mb-5"><span class="numero-passo">{{ passo.numero }}</span></p>
                    <h3 class="text-titulo-md font-semibold text-tinta-900 mb-2 md:mb-3 md:mt-auto">{{ passo.titulo }}</h3>
                    <p class="text-[0.9375rem] leading-relaxed text-tinta-600">{{ passo.texto }}</p>
                  </div>

                  <div data-sombra class="absolute inset-0 bg-tinta-900 opacity-0 pointer-events-none"
                       aria-hidden="true"></div>
                </article>
              </li>
            }
          </ol>
        </div>
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
    const sombras = itens.map((li) => li.querySelector<HTMLElement>('[data-sombra]')!);
    // Tudo que mostra "em que passo estou": os itens do trilho, os da faixa do
    // celular e os próprios cartões (o número de cada um acende junto).
    const marcos = Array.from(raiz.querySelectorAll<HTMLElement>('[data-passo]'));
    const progressos = Array.from(raiz.querySelectorAll<HTMLElement>('[data-progresso]'));

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

      // O de baixo só escurece — não encolhe. Encolher deixava os cartões de trás
      // mais estreitos que o da frente e o maço parecia torto.
      sombras.forEach((sombra, i) => {
        sombra.style.opacity = (ESCURECE * (chegada[i + 1] ?? 0)).toFixed(3);
      });

      const ultimo = itens.length - 1;
      const inicio = topoLista + naturais[0] - topos[0];
      const fim = topoLista + naturais[ultimo] - topos[ultimo];
      // inicio e fim são distâncias até grudar; a perfuração enche de 0 a 1
      // entre o primeiro e o último cartão grudarem.
      const fracao = limitar(inicio / Math.min(inicio - fim, -1)).toFixed(4);
      progressos.forEach((p) => {
        p.style.transform = p.dataset['progresso'] === 'x' ? `scaleX(${fracao})` : `scaleY(${fracao})`;
      });

      // O passo atual é o último cujo cartão já cobriu mais da metade do anterior.
      // Só mexe nos atributos quando ele muda: reescrever o mesmo valor a cada
      // quadro faria o navegador recalcular estilos à toa.
      const atual = chegada.reduce((ultimoVisto, c, i) => (c >= 0.6 ? i : ultimoVisto), 0);
      if (atual !== atualAplicado) {
        atualAplicado = atual;
        marcos.forEach((marco) => {
          const passo = Number(marco.dataset['passo']);
          marco.dataset['feito'] = String(passo <= atual);
          marco.dataset['atual'] = String(passo === atual);
        });
      }
    };
    let atualAplicado = 0;

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
