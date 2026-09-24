import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParalaxeDirective } from '../../shared/directives/paralaxe.directive';
import { RevelarDirective } from '../../shared/directives/revelar.directive';
import { MarquiseComponent } from '../../shared/components/marquise/marquise.component';
import { EventService } from '../events/event.service';

interface Secao {
  readonly etiqueta: string;
  readonly titulo: string;
  readonly texto: string;
  readonly imagem: string;
  readonly alt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ParalaxeDirective, RevelarDirective, MarquiseComponent],
  template: `
    <!--
      ================= ABERTURA =================
      Imagem de largura total com o texto por cima. O título continua sendo HTML,
      não pixel: responde a tamanho de tela, é lido por leitor de tela e conta
      para busca. Texto embutido em imagem não faz nada disso.
    -->
    <section class="relative -mt-16 pt-16 min-h-[34rem] md:min-h-[46rem] flex items-center overflow-hidden bg-tinta-900">
      <!--
        Duas camadas de proposito. O paralaxe escreve transform no elemento que
        envolve, e o zoom de entrada escreve transform na imagem: numa camada so,
        um sobrescreveria o outro e um dos dois sumiria.

        A imagem tem 125% da altura, recuada 12.5% no topo, para haver folga em
        cima e embaixo. Sem essa sobra, o deslocamento do scroll revelaria a
        borda da foto e apareceria uma faixa vazia.
      -->
      <div appParalaxe [deslocamento]="-70"
           class="absolute inset-x-0 -top-[12.5%] h-[125%]">
        <img src="hero-show.jpg" alt="" fetchpriority="high" decoding="async"
             class="w-full h-full object-cover object-left animate-assentar" />
      </div>

      <!--
        Véu escuro. A foto tem refletor verde estourado do lado esquerdo, onde o
        texto vai: sem isto o branco sobre verde claro cai para perto de 1.5 de
        contraste e fica ilegível na prática.
      -->
      <div class="absolute inset-0 bg-gradient-to-l from-tinta-900 via-tinta-900/80 to-tinta-900/10
                  lg:to-transparent"
           aria-hidden="true"></div>

      <div class="absolute inset-0 bg-tinta-900/35 lg:bg-transparent" aria-hidden="true"></div>

      <div class="relative max-w-6xl mx-auto px-6 py-20 w-full">
        <div class="max-w-xl lg:ml-auto animate-entrar-baixo">
          <p class="etiqueta text-acento-500 mb-5">Ingressos sem sobrevenda</p>

          <h1 class="text-titulo-xl font-semibold text-papel-50 mb-6">
            O lugar é seu<br />
            no instante do clique.
          </h1>

          <p class="text-lg leading-relaxed text-papel-300 mb-9">
            A vaga sai do estoque assim que você reserva e fica guardada por quinze
            minutos enquanto você paga. Acabou aquela história de perder o ingresso
            no meio do checkout.
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <a routerLink="/events" class="btn-principal">Ver eventos em cartaz</a>
            <a href="#como-funciona"
               class="btn border border-papel-50/40 text-papel-50 hover:bg-papel-50 hover:text-tinta-900 active:translate-y-px">
              Como funciona
            </a>
          </div>
        </div>
      </div>
    </section>

    <!--
      ================= EM CARTAZ =================
      A marquise so aparece quando ha eventos: uma faixa vazia deslizando seria
      pior do que faixa nenhuma.
    -->
    @if (emCartaz().length > 0) {
      <app-marquise [itens]="emCartaz()" />
    }

    <!-- ================= COMO FUNCIONA ================= -->
    <section id="como-funciona" class="border-b border-papel-300 bg-papel-200/60">
      <div class="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <h2 class="text-titulo-md font-semibold text-tinta-900 mb-12">Como funciona</h2>

        <ol class="grid md:grid-cols-3 gap-6 md:gap-7">
          @for (passo of passos; track passo.numero; let i = $index) {
            <li appRevelar [atraso]="i * 110"
                class="bilhete overflow-hidden flex flex-col"
                style="--recorte-y: calc(100% - 10.5rem)">

              <img [src]="passo.imagem" [alt]="passo.alt" loading="lazy" decoding="async"
                   class="w-full h-64 object-cover" />

              <div class="perfuracao"></div>

              <div class="px-6 py-6 flex-1 min-h-[10.5rem]">
                <p class="numero text-sm font-bold text-acento-texto mb-2">{{ passo.numero }}</p>
                <h3 class="text-titulo-sm font-semibold text-tinta-900 mb-2">{{ passo.titulo }}</h3>
                <p class="text-sm leading-relaxed text-tinta-600">{{ passo.texto }}</p>
              </div>
            </li>
          }
        </ol>
      </div>
    </section>

    <!--
      ================= O CANHOTO =================
      Cada peça da identidade ganha o próprio espaço, com a copy ao lado em HTML.
      Portaria e painel do organizador ficaram de fora daqui: "Como funciona"
      ja os apresenta, e repetir o mesmo assunto duas vezes na mesma pagina
      cansa mais do que informa.
    -->
    @for (secao of secoes; track secao.titulo) {
      <section class="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          <div appRevelar appParalaxe [deslocamento]="34"
               class="bilhete overflow-hidden shadow-papel-alta"
               style="--recorte-y: 50%">
            <img [src]="secao.imagem" [alt]="secao.alt" loading="lazy" decoding="async"
                 class="w-full h-72 md:h-96 object-cover" />
          </div>

          <div appRevelar [atraso]="120">
            <p class="etiqueta text-acento-texto mb-4">{{ secao.etiqueta }}</p>
            <h2 class="text-titulo-lg font-semibold text-tinta-900 mb-5 leading-tight">
              {{ secao.titulo }}
            </h2>
            <p class="text-lg leading-relaxed text-tinta-600">{{ secao.texto }}</p>
          </div>
        </div>
      </section>
    }

    <!-- ================= FECHAMENTO ================= -->
    <section class="border-t border-papel-300 bg-papel-200/60">
      <div class="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div class="max-w-2xl">
          <h2 class="text-titulo-lg font-semibold text-tinta-900 mb-5">
            Por que “Canhoto”?
          </h2>
          <p class="text-lg leading-relaxed text-tinta-600 mb-4">
            Todo ingresso de papel tem duas partes. Uma fica na portaria, presa num
            gancho atrás do balcão. A outra — o canhoto — fica com você, no bolso da
            calça, e vira prova de que você esteve lá.
          </p>
          <p class="text-lg leading-relaxed text-tinta-600 mb-8">
            Aqui o canhoto é digital e assinado: só vale uma vez, e ninguém consegue
            forjar outro igual.
          </p>
          <a routerLink="/events" class="btn-tinta">Começar pelos eventos</a>
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {

  private readonly eventos = inject(EventService);

  /** Nomes dos proximos eventos, para a marquise. */
  readonly emCartaz = signal<string[]>([]);

  ngOnInit(): void {
    // Falha silenciosa de proposito: a marquise e enfeite. Se a API estiver
    // fora, a home segue inteira sem ela, em vez de mostrar erro por um adorno.
    this.eventos.getEvents({}, 0, 10).subscribe({
      next: (pagina) => this.emCartaz.set(pagina.content.map((e) => e.name)),
      error: () => this.emCartaz.set([]),
    });
  }

  readonly passos = [
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

  readonly secoes: Secao[] = [
    {
      etiqueta: 'O canhoto',
      titulo: 'Uma parte fica com você',
      texto: `O código do seu ingresso é assinado com HMAC e não fica guardado num
              banco à espera de ser copiado: ele é recalculado a partir da reserva.
              Trocar um caractere invalida a assinatura inteira.`,
      imagem: 'secao-ingresso.jpg',
      alt: 'Ingresso do Canhoto sendo segurado na mão, com QR code impresso',
    },
  ];
}
