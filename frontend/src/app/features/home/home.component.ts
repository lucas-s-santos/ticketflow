import { Component, ElementRef, NgZone, OnDestroy, OnInit, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ParalaxeDirective } from '../../shared/directives/paralaxe.directive';
import { RevelarDirective } from '../../shared/directives/revelar.directive';
import { RevelarMascaraDirective } from '../../shared/directives/revelar-mascara.directive';
import { MarquiseComponent } from '../../shared/components/marquise/marquise.component';
import { EventService } from '../events/event.service';
import { Ingresso3dComponent } from './ingresso-3d/ingresso-3d.component';
import { ComoFuncionaComponent } from './como-funciona/como-funciona.component';
import { AssinaturaDemoComponent } from './assinatura-demo/assinatura-demo.component';

gsap.registerPlugin(SplitText);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink, ParalaxeDirective, RevelarDirective, RevelarMascaraDirective, MarquiseComponent,
    Ingresso3dComponent, ComoFuncionaComponent, AssinaturaDemoComponent,
  ],
  template: `
    <!--
      ================= ABERTURA =================
      O palco escuro com o ingresso girando sob um refletor. O título continua
      sendo HTML, não pixel: responde a tamanho de tela, é lido por leitor de
      tela e conta para busca.
    -->
    <section #abertura class="relative isolate -mt-16 pt-16 overflow-hidden bg-tinta-900">
      <div class="luz-palco absolute inset-0 -z-10" aria-hidden="true"></div>

      <div class="max-w-6xl mx-auto px-6 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center
                  gap-4 lg:gap-0 lg:min-h-[44rem] pt-4 pb-16 lg:py-0">

        <div class="order-2 lg:order-1 max-w-xl relative z-10">
          <p data-abertura class="etiqueta text-acento-500 mb-5">Ingressos sem sobrevenda</p>

          <h1 data-titulo class="text-titulo-xl font-semibold text-papel-50 mb-6">
            O lugar é seu<br />
            no instante<br />
            do clique.
          </h1>

          <p data-abertura class="text-lg leading-relaxed text-papel-300 mb-9">
            A vaga sai do estoque assim que você reserva e fica guardada por quinze
            minutos enquanto você paga. Acabou aquela história de perder o ingresso
            no meio do checkout.
          </p>

          <div data-abertura class="flex flex-wrap items-center gap-3">
            <a routerLink="/events" class="btn-principal">Ver eventos em cartaz</a>
            <a href="#como-funciona"
               class="btn border border-papel-50/40 text-papel-50 hover:bg-papel-50 hover:text-tinta-900 active:translate-y-px">
              Como funciona
            </a>
          </div>
        </div>

        <!--
          O ingresso sangra para a direita no desktop: maior que a coluna, ele
          ocupa o palco em vez de caber numa caixa. A sangria cresce com a tela
          e nunca passa da margem que sobra fora do container de 72rem — senão o
          ingresso inclinado seria cortado pela borda da janela.
        -->
        <div class="order-1 lg:order-2 relative h-[16rem] sm:h-[22rem] lg:h-[40rem] -mx-6 lg:mx-0 lg:-mr-4 xl:-mr-16 2xl:-mr-36">
          <div class="absolute left-1/2 bottom-[10%] -translate-x-1/2 w-3/5 h-12 rounded-[50%] bg-acento-500/20 blur-3xl"
               aria-hidden="true"></div>
          <app-ingresso-3d class="absolute inset-0" />
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
    <app-como-funciona />

    <!--
      ================= O CANHOTO =================
      A foto abre por máscara ao entrar na tela, e ao lado a demonstração da
      assinatura: a frase "trocar um caractere invalida a assinatura" vira um
      botão que faz exatamente isso. Portaria e painel do organizador ficaram de
      fora daqui: "Como funciona" já os apresenta.
    -->
    <section class="max-w-6xl mx-auto px-6 py-16 md:py-24">
      <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

        <div appRevelarMascara appParalaxe [deslocamento]="34"
             class="bilhete overflow-hidden shadow-papel-alta"
             style="--recorte-y: 50%">
          <img src="secao-ingresso.jpg" alt="Ingresso do Canhoto sendo segurado na mão, com QR code impresso"
               loading="lazy" decoding="async"
               class="w-full h-72 md:h-[30rem] object-cover" />
        </div>

        <div>
          <div appRevelar>
            <p class="etiqueta text-acento-texto mb-4">O canhoto</p>
            <h2 class="text-titulo-lg font-semibold text-tinta-900 mb-5 leading-tight">
              Uma parte fica com você
            </h2>
            <p class="text-lg leading-relaxed text-tinta-600 mb-8">
              O código do seu ingresso é assinado com HMAC e não fica guardado num
              banco à espera de ser copiado: ele é recalculado a partir da reserva.
              Trocar um caractere invalida a assinatura inteira.
            </p>
          </div>
          <app-assinatura-demo appRevelar [atraso]="120" class="block" />
        </div>
      </div>
    </section>

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
export class HomeComponent implements OnInit, OnDestroy {

  private readonly eventos = inject(EventService);
  private readonly zona = inject(NgZone);
  private readonly abertura = viewChild.required<ElementRef<HTMLElement>>('abertura');

  /** Nomes dos proximos eventos, para a marquise. */
  readonly emCartaz = signal<string[]>([]);

  private animacao?: gsap.Context;
  private destruido = false;

  constructor() {
    // Fora da zona: o ticker do GSAP e um loop de requestAnimationFrame, e
    // dentro dela cada quadro dispararia deteccao de mudancas na aplicacao.
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => void this.animarAbertura());
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.animacao?.revert();
  }

  /**
   * O unico momento orquestrado da pagina: o titulo sobe linha a linha por
   * tras de uma mascara enquanto o ingresso chega girando. O resto da home
   * fica quieto de proposito — movimento em toda secao vira ruido.
   */
  private async animarAbertura(): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const raiz = this.abertura().nativeElement;
    // Esconde antes da primeira pintura e so revela com as fontes prontas:
    // o SplitText mede as linhas, e medir com a fonte reserva quebraria o
    // titulo no lugar errado quando a Fraunces chegasse.
    gsap.set(raiz.querySelectorAll('[data-titulo], [data-abertura]'), { autoAlpha: 0 });
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
    if (this.destruido) return;

    this.animacao = gsap.context(() => {
      const titulo = SplitText.create('[data-titulo]', { type: 'lines', mask: 'lines' });
      gsap.set('[data-titulo]', { autoAlpha: 1 });

      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from(titulo.lines, { yPercent: 110, duration: 1.2, stagger: 0.1 }, 0.15)
        .fromTo('[data-abertura]', { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.08 }, 0.35)
        // Desfaz a divisao no fim: devolve o h1 original ao DOM, que volta a
        // quebrar linha sozinho se a janela mudar de tamanho.
        .add(() => titulo.revert());
    }, raiz);
  }

  ngOnInit(): void {
    // Falha silenciosa de proposito: a marquise e enfeite. Se a API estiver
    // fora, a home segue inteira sem ela, em vez de mostrar erro por um adorno.
    this.eventos.getEvents({}, 0, 10).subscribe({
      next: (pagina) => this.emCartaz.set(pagina.content.map((e) => e.name)),
      error: () => this.emCartaz.set([]),
    });
  }
}
