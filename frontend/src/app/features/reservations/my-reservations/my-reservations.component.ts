import {
  ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, afterNextRender, computed, inject, signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe, DatePipe, NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { interval, Subscription, switchMap } from 'rxjs';
import { ReservationService } from '../reservation.service';
import { ReservationResponse } from '../reservation.model';
import { PaymentService } from '../../payments/payment.service';
import { PaymentMethod } from '../../payments/payment.model';

gsap.registerPlugin(Flip);

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, NgTemplateOutlet, RouterLink, QRCodeComponent],
  template: `
    <div class="max-w-5xl mx-auto px-6 py-12 md:py-16">

      <p class="etiqueta text-acento-texto mb-3">Sua carteira</p>
      <h1 class="text-titulo-lg font-semibold text-tinta-900 mb-12">Meus ingressos</h1>

      @if (carregando()) {
        <div class="grid gap-6 md:grid-cols-2" aria-hidden="true">
          @for (vazio of [1, 2]; track vazio) {
            <div class="bilhete p-6 animate-pulse" style="--recorte-y: 65%">
              <div class="h-3 w-24 bg-papel-200 mb-5"></div>
              <div class="h-6 w-3/4 bg-papel-200 mb-3"></div>
              <div class="h-4 w-1/2 bg-papel-200"></div>
            </div>
          }
        </div>
        <p class="sr-only">Carregando ingressos</p>

      } @else if (reservas().length === 0) {
        <div class="bilhete p-12 text-center max-w-md" style="--recorte-y: 50%">
          <p class="font-display text-titulo-sm font-semibold text-tinta-900 mb-2">
            Sua carteira está vazia
          </p>
          <p class="text-sm text-tinta-500 mb-7">
            Os ingressos que você comprar aparecem aqui, com o QR code para a portaria.
          </p>
          <a routerLink="/events" class="btn-principal">Ver eventos em cartaz</a>
        </div>

      } @else {

        <!-- ============ AGUARDANDO PAGAMENTO ============ -->
        @if (pendentes().length > 0) {
          <section class="mb-14">
            <div class="flex items-baseline gap-3 mb-5">
              <h2 class="text-titulo-sm font-semibold text-tinta-900">Aguardando pagamento</h2>
              <span class="etiqueta text-tinta-400">{{ pendentes().length }}</span>
            </div>

            <div class="grid gap-6 md:grid-cols-2">
              @for (r of pendentes(); track r.id) {
                <article class="bilhete flex flex-col" style="--recorte-y: calc(100% - 7rem)">
                  <div class="p-6 flex-1">
                    @if (tempoRestante(r); as t) {
                      <div class="flex items-center justify-between gap-3 mb-4">
                        <span class="etiqueta" [class]="t.urgente ? 'text-erro-600' : 'text-ocre-600'">
                          Expira em
                        </span>
                        <span class="numero text-lg font-bold tabular-nums"
                              [class]="t.urgente ? 'text-erro-600' : 'text-tinta-900'"
                              aria-live="polite">
                          {{ t.texto }}
                        </span>
                      </div>
                      <div class="h-1 w-full bg-papel-300 overflow-hidden mb-5" aria-hidden="true">
                        <div class="h-full transition-[width] duration-1000 ease-linear"
                             [class]="t.urgente ? 'bg-erro-500' : 'bg-ocre-500'"
                             [style.width.%]="t.percentual"></div>
                      </div>
                    } @else {
                      <p class="etiqueta text-tinta-400 mb-5">Prazo encerrado</p>
                    }

                    <h3 class="font-display text-titulo-sm font-semibold text-tinta-900 mb-1.5 leading-snug">
                      {{ r.eventName }}
                    </h3>
                    <p class="text-sm text-tinta-500 mb-4">
                      {{ r.sectorName }} · {{ r.quantity }} {{ r.quantity === 1 ? 'ingresso' : 'ingressos' }}
                    </p>
                    <p class="numero text-2xl font-bold text-tinta-900">
                      {{ r.totalPrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </p>
                  </div>

                  <div class="perfuracao"></div>

                  <div class="px-6 h-28 flex items-center">
                    @if (processandoId() === r.id) {
                      <div class="flex items-center gap-3 text-sm text-tinta-600">
                        <span class="inline-block w-4 h-4 border-2 border-acento-500 border-t-transparent rounded-full animate-spin"></span>
                        <span>
                          <strong class="font-semibold">Processando…</strong>
                          o gateway responde em alguns segundos.
                        </span>
                      </div>

                    } @else if (escolhendoId() === r.id) {
                      <div class="w-full">
                        <p class="campo-rotulo mb-2">Pagar com</p>
                        <div class="flex gap-2">
                          <button type="button" (click)="pagar(r, 'PIX')" class="btn-principal btn-pequeno flex-1">Pix</button>
                          <button type="button" (click)="pagar(r, 'CREDIT_CARD')" class="btn-contorno btn-pequeno flex-1">Cartão</button>
                          <button type="button" (click)="escolhendoId.set(null)" class="btn-fantasma btn-pequeno"
                                  aria-label="Cancelar escolha de pagamento">✕</button>
                        </div>
                      </div>

                    } @else {
                      <div class="w-full">
                        @if (falhouId() === r.id) {
                          <p class="text-xs text-acento-texto mb-2">
                            Pagamento não concluído. Tente de novo.
                          </p>
                        }
                        <div class="flex items-center gap-2">
                          <button type="button" (click)="escolherPagamento(r.id)" class="btn-principal btn-pequeno flex-1">
                            Pagar agora
                          </button>
                          <button type="button" (click)="cancelar(r.id)" [disabled]="cancelandoId() === r.id"
                                  class="btn-fantasma btn-pequeno">
                            {{ cancelandoId() === r.id ? 'Cancelando…' : 'Cancelar' }}
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </article>
              }
            </div>
          </section>
        }

        <!-- ============ INGRESSOS CONFIRMADOS ============ -->
        @if (confirmadas().length > 0) {
          <section class="mb-14">
            <div class="flex items-baseline gap-3 mb-5">
              <h2 class="text-titulo-sm font-semibold text-tinta-900">Prontos para usar</h2>
              <span class="etiqueta text-tinta-400">{{ confirmadas().length }}</span>
            </div>

            <!-- O mesmo cabeçalho nos dois estados: a pessoa reconhece o ingresso
                 que tocou no maço quando ele chega à frente. -->
            <ng-template #cabecalho let-r>
              <span class="min-w-0">
                <span class="block font-display text-titulo-sm font-semibold text-tinta-900 leading-snug truncate">
                  {{ r.eventName }}
                </span>
                <span class="block text-sm text-tinta-500 mt-0.5 truncate">
                  {{ r.sectorName }} · {{ r.quantity }} {{ r.quantity === 1 ? 'ingresso' : 'ingressos' }}
                </span>
              </span>
              @if (r.checkedInAt) {
                <span class="selo-neutro shrink-0">Utilizado</span>
              } @else {
                <span class="selo-confirmado shrink-0">Válido</span>
              }
            </ng-template>

            <!--
              A carteira: o primeiro ingresso fica aberto, com o QR à vista — na
              portaria ninguém deveria precisar de um toque a mais. Os outros formam
              um maço de cabeçalhos; tocar num deles o traz para a frente.

              Uma lista só, em duas colunas no desktop: o aberto ocupa a primeira
              (e acompanha a rolagem), o maço desce na segunda. Por ser a mesma
              lista, o Flip anima o cartão atravessando de uma coluna para a outra.
            -->
            <ol #maco class="max-w-xl lg:max-w-none lg:grid lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]
                             lg:gap-x-10 lg:items-start"
                aria-label="Carteira de ingressos">
              @for (r of carteira(); track r.id; let i = $index; let frente = $first) {
                <li class="relative {{
                      i === 0 ? 'lg:col-start-1 lg:[grid-row:1/span_99] lg:sticky lg:top-24'
                      : i === 1 ? 'mt-6 lg:mt-0 lg:col-start-2'
                      : '-mt-3 lg:col-start-2' }}">
                  <!--
                    Só o aberto é .bilhete: a máscara das mordidas cortaria a sombra, e é
                    a sombra para cima que faz o maço parecer empilhado. box-shadow, não
                    filter: drop-shadow — repintar filtro em 14 cartões a cada quadro do
                    Flip travava a animação.
                  -->
                  <article data-cartao
                           class="relative overflow-hidden bg-papel-50 rounded-bilhete transition-opacity duration-200"
                           [class.bilhete]="frente"
                           [class.touch-pan-y]="frente"
                           [class.sombra-maco]="!frente"
                           [class.h-20]="!frente"
                           [class.opacity-60]="!frente && r.checkedInAt"
                           [attr.tabindex]="frente ? -1 : null"
                           [attr.data-frente]="frente ? '' : null"
                           style="--recorte-y: calc(100% - 12rem)">

                    @if (frente) {
                      <div class="h-20 px-5 flex items-center justify-between gap-4">
                        <ng-container *ngTemplateOutlet="cabecalho; context: { $implicit: r }" />
                      </div>
                    } @else {
                      <button type="button" (click)="selecionar(r.id)"
                              class="w-full h-20 px-5 flex items-center justify-between gap-4 text-left
                                     transition-colors hover:bg-papel-100"
                              [attr.aria-label]="'Abrir o ingresso de ' + r.eventName + ', ' + r.sectorName">
                        <ng-container *ngTemplateOutlet="cabecalho; context: { $implicit: r }" />
                      </button>
                    }

                    <!-- No maço, o canhoto existe mas fica recortado: inert o tira do
                         Tab e do leitor de tela até o ingresso vir para a frente. -->
                    <div [attr.inert]="frente ? null : ''">
                      <div class="perfuracao"></div>

                      <!-- Canhoto: o QR e o codigo -->
                      <div class="px-6 h-48 flex items-center gap-5">
                        <div class="shrink-0 bg-papel-50 p-1" [class.opacity-35]="r.checkedInAt">
                          <qrcode [qrdata]="r.ticketToken!" [width]="120" [margin]="0"
                                  [errorCorrectionLevel]="'M'" [elementType]="'svg'"></qrcode>
                        </div>

                        <div class="min-w-0">
                          @if (r.checkedInAt) {
                            <p class="etiqueta text-tinta-400 mb-1.5">Check-in feito</p>
                            <p class="numero text-sm text-tinta-600 mb-3">
                              {{ r.checkedInAt | date:'dd/MM · HH:mm':undefined:'pt-BR' }}
                            </p>
                            <p class="text-xs leading-relaxed text-tinta-500">
                              Este canhoto já foi carimbado e não vale para uma segunda entrada.
                            </p>
                          } @else {
                            <p class="etiqueta text-tinta-400 mb-1.5">Na portaria</p>
                            <p class="text-xs leading-relaxed text-tinta-600 mb-3">
                              Apresente este código. Ele vale uma única vez.
                            </p>
                            <p class="numero text-[0.65rem] text-tinta-400 break-all">
                              {{ codigoCurto(r) }}
                            </p>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Carimbo sobre o ingresso ja utilizado, só quando aberto -->
                    @if (frente && r.checkedInAt) {
                      <div class="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden="true">
                        <span class="carimbo text-erro-500/50 border-erro-500/40">Utilizado</span>
                      </div>
                    }
                  </article>
                  @if (frente && carteira().length > 1) {
                    <p class="lg:hidden etiqueta text-tinta-400 text-center mt-3" aria-hidden="true">
                      Arraste para o lado para trocar de ingresso
                    </p>
                  }
                </li>
              }
            </ol>
          </section>
        }

        <!-- ============ HISTORICO ============ -->
        @if (encerradas().length > 0) {
          <section>
            <h2 class="text-titulo-sm font-semibold text-tinta-900 mb-5">Histórico</h2>
            <ul class="border-t border-papel-300">
              @for (r of encerradas(); track r.id) {
                <li class="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-papel-300">
                  <div class="min-w-0">
                    <p class="font-medium text-tinta-600 truncate">{{ r.eventName }}</p>
                    <p class="etiqueta text-tinta-400 mt-1">
                      {{ r.sectorName }} · {{ r.createdAt | date:'dd/MM/yyyy':undefined:'pt-BR' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="numero text-sm text-tinta-400">
                      {{ r.totalPrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </span>
                    <span class="selo-neutro">{{ rotuloStatus(r.status) | uppercase }}</span>
                  </div>
                </li>
              }
            </ul>
          </section>
        }
      }
    </div>
  `,
})
export class MyReservationsComponent implements OnInit, OnDestroy {
  private readonly reservationService = inject(ReservationService);
  private readonly paymentService = inject(PaymentService);

  readonly reservas = signal<ReservationResponse[]>([]);
  readonly carregando = signal(true);
  readonly cancelandoId = signal<string | null>(null);

  readonly escolhendoId = signal<string | null>(null);   // reserva com seletor de metodo aberto
  readonly processandoId = signal<string | null>(null);  // reserva com pagamento em andamento
  readonly falhouId = signal<string | null>(null);       // reserva com pagamento recusado

  // Relogio da aplicacao: avanca a cada segundo e alimenta a contagem regressiva.
  // Um unico intervalo serve todos os ingressos da tela.
  private readonly agora = signal(Date.now());
  private relogio?: Subscription;
  private cobranca?: Subscription;

  readonly pendentes = computed(() => this.reservas().filter((r) => r.status === 'PENDING'));
  readonly confirmadas = computed(() =>
    this.reservas().filter((r) => r.status === 'CONFIRMED' && !!r.ticketToken),
  );
  readonly encerradas = computed(() =>
    this.reservas().filter((r) => r.status === 'EXPIRED' || r.status === 'CANCELLED'),
  );

  // ---------------------------------------------------------------- carteira
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);
  private desligarArraste?: () => void;
  private readonly detector = inject(ChangeDetectorRef);
  private readonly listaCarteira = viewChild<ElementRef<HTMLElement>>('maco');
  private readonly reduzido = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Ingresso que a pessoa trouxe para a frente. Nulo até o primeiro toque. */
  private readonly escolhidoId = signal<string | null>(null);

  /** Na frente: o escolhido ou, sem escolha, o primeiro que ainda vale. */
  private readonly frenteId = computed(() => {
    const lista = this.confirmadas();
    const escolhido = this.escolhidoId();
    if (escolhido && lista.some((r) => r.id === escolhido)) return escolhido;
    return (lista.find((r) => !r.checkedInAt) ?? lista[0])?.id ?? null;
  });

  /** A frente primeiro; atrás, os válidos e por último os já usados. */
  readonly carteira = computed(() => {
    const lista = this.confirmadas();
    const id = this.frenteId();
    const frente = lista.filter((r) => r.id === id);
    const resto = lista.filter((r) => r.id !== id);
    return [...frente, ...resto.filter((r) => !r.checkedInAt), ...resto.filter((r) => r.checkedInAt)];
  });

  ngOnInit(): void {
    this.carregar();
    this.relogio = interval(1000).subscribe(() => this.agora.set(Date.now()));
  }

  constructor() {
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => this.ligarArraste());
    });
  }

  ngOnDestroy(): void {
    this.relogio?.unsubscribe();
    this.cobranca?.unsubscribe();
    this.desligarArraste?.();
  }

  /**
   * No toque, arrastar o ingresso aberto para o lado troca para o vizinho:
   * para a esquerda vai ao próximo, para a direita volta ao anterior.
   *
   * <p>Delegado na raiz do componente porque a carteira só aparece depois que
   * a API responde, e o ingresso da frente muda a cada troca. Mouse fica de
   * fora: no desktop o maço está ao lado e um clique resolve.
   */
  private ligarArraste(): void {
    const raiz = this.host.nativeElement as HTMLElement;
    let cartao: HTMLElement | null = null;
    let ponteiro = -1;
    let x0 = 0;
    let y0 = 0;
    let xAnterior = 0;
    let tAnterior = 0;
    let velocidade = 0; // px por ms
    let horizontal = false;

    const aoPressionar = (e: PointerEvent) => {
      if (cartao || e.pointerType === 'mouse' || this.carteira().length < 2) return;
      const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-frente]');
      if (!alvo) return;
      cartao = alvo;
      ponteiro = e.pointerId;
      x0 = xAnterior = e.clientX;
      y0 = e.clientY;
      tAnterior = performance.now();
      velocidade = 0;
      horizontal = false;
      gsap.killTweensOf(alvo);
    };

    const aoMover = (e: PointerEvent) => {
      if (!cartao || e.pointerId !== ponteiro) return;
      const dx = e.clientX - x0;
      if (!horizontal) {
        // Só vira arraste depois de andar mais para o lado do que para cima ou
        // para baixo: o mesmo dedo também rola a página.
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - y0)) return;
        horizontal = true;
        cartao.setPointerCapture(ponteiro);
      }
      const agora = performance.now();
      velocidade = (e.clientX - xAnterior) / Math.max(agora - tAnterior, 1);
      xAnterior = e.clientX;
      tAnterior = agora;
      gsap.set(cartao, { x: dx, rotation: dx * 0.03 });
    };

    const aoSoltar = (e: PointerEvent) => {
      if (!cartao || e.pointerId !== ponteiro) return;
      const alvo = cartao;
      cartao = null;
      ponteiro = -1;
      if (!horizontal) return;

      const dx = Number(gsap.getProperty(alvo, 'x')) || 0;
      const sentido = Math.sign(dx || velocidade) || 1;
      // Um peteleco rápido basta; devagar, precisa passar de um terço da largura.
      const trocou = e.type !== 'pointercancel'
        && (Math.abs(dx) > alvo.offsetWidth / 3 || Math.abs(velocidade) > 0.35);

      if (!trocou) {
        gsap.to(alvo, { x: 0, rotation: 0, duration: 0.45, ease: 'back.out(1.6)' });
        return;
      }
      gsap.to(alvo, {
        x: sentido * alvo.offsetWidth * 1.15,
        rotation: sentido * 10,
        opacity: 0,
        duration: 0.22,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(alvo, { clearProps: 'transform,opacity' });
          this.zona.run(() => this.irParaVizinho(sentido < 0 ? 1 : -1));
          const novo = raiz.querySelector<HTMLElement>('[data-frente]');
          // O novo entra pelo lado oposto ao que o anterior saiu.
          if (novo && !this.reduzido) {
            gsap.from(novo, { x: -sentido * 48, opacity: 0, duration: 0.3, ease: 'power3.out' });
          }
        },
      });
    };

    raiz.addEventListener('pointerdown', aoPressionar);
    raiz.addEventListener('pointermove', aoMover);
    raiz.addEventListener('pointerup', aoSoltar);
    raiz.addEventListener('pointercancel', aoSoltar);
    this.desligarArraste = () => {
      raiz.removeEventListener('pointerdown', aoPressionar);
      raiz.removeEventListener('pointermove', aoMover);
      raiz.removeEventListener('pointerup', aoSoltar);
      raiz.removeEventListener('pointercancel', aoSoltar);
    };
  }

  /** Troca o ingresso da frente pelo vizinho na ordem original, dando a volta nas pontas. */
  private irParaVizinho(passo: number): void {
    const lista = this.confirmadas();
    const atual = lista.findIndex((r) => r.id === this.frenteId());
    const proximo = lista[(atual + passo + lista.length) % lista.length];
    if (!proximo) return;
    this.escolhidoId.set(proximo.id);
    this.detector.detectChanges();
    this.listaCarteira()?.nativeElement.querySelector<HTMLElement>('[data-frente]')?.focus({ preventScroll: true });
  }

  // Quanto falta para a reserva expirar, em mm:ss, mais o percentual da janela
  // de 15 minutos que ainda resta — usado na barra de progresso.
  tempoRestante(r: ReservationResponse): { texto: string; urgente: boolean; percentual: number } | null {
    const fim = new Date(r.expiresAt).getTime();
    const faltam = fim - this.agora();
    if (faltam <= 0) {
      return null;
    }
    const totalSegundos = Math.floor(faltam / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return {
      texto: `${minutos}:${String(segundos).padStart(2, '0')}`,
      urgente: totalSegundos <= 120,
      percentual: Math.min(100, (faltam / (15 * 60 * 1000)) * 100),
    };
  }

  // Primeiros caracteres do token, agrupados — identifica o ingresso sem
  // despejar a assinatura HMAC inteira na tela.
  codigoCurto(r: ReservationResponse): string {
    const limpo = (r.ticketToken ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `CNH·${limpo.slice(0, 4)}·${limpo.slice(4, 8)}·${limpo.slice(8, 12)}`;
  }

  rotuloStatus(status: string): string {
    const mapa: Record<string, string> = {
      PENDING: 'Pendente',
      CONFIRMED: 'Confirmado',
      EXPIRED: 'Expirado',
      CANCELLED: 'Cancelado',
    };
    return mapa[status] ?? status;
  }

  /**
   * Traz um ingresso do maço para a frente.
   *
   * <p>Flip: mede todos os cartões, deixa o Angular reordenar o DOM e anima cada
   * um da posição antiga para a nova. A altura também é animada — o cartão é
   * overflow-hidden, então o canhoto com o QR vai aparecendo enquanto ele abre,
   * e o que sai da frente fecha do mesmo jeito.
   */
  selecionar(id: string): void {
    if (id === this.frenteId()) return;
    const lista = this.listaCarteira()?.nativeElement;
    const cartoes = lista ? Array.from(lista.querySelectorAll<HTMLElement>('[data-cartao]')) : [];
    const antes = this.reduzido || cartoes.length === 0 ? null : Flip.getState(cartoes);

    this.escolhidoId.set(id);
    // Aplica a nova ordem agora, para o Flip medir o estado final em seguida.
    this.detector.detectChanges();

    // Mede onde o ingresso aberto terminou antes de o Flip deslocá-lo de volta
    // para o ponto de partida.
    const frente = lista?.querySelector<HTMLElement>('[data-frente]');
    const topoFinal = frente?.getBoundingClientRect().top ?? 0;

    if (antes) {
      this.zona.runOutsideAngular(() => {
        // prune: só anima quem mudou de lugar ou de tamanho. Os cartões do maço
        // que ficam onde estavam não ganham camada nem transform à toa.
        Flip.from(antes, { duration: 0.45, ease: 'power3.inOut', prune: true });
      });
    }

    if (frente) {
      // O foco acompanha o ingresso aberto (teclado e leitor de tela sabem onde
      // estão). No celular ele sobe para o topo da carteira, que pode ter ficado
      // acima da tela; a página vai até lá. No desktop ele é fixo e já está à vista.
      frente.focus({ preventScroll: true });
      if (topoFinal < 72) {
        window.scrollTo({
          top: topoFinal + window.scrollY - 96,
          behavior: this.reduzido ? 'auto' : 'smooth',
        });
      }
    }
  }

  escolherPagamento(id: string): void {
    this.falhouId.set(null);
    this.escolhendoId.set(id);
  }

  pagar(reserva: ReservationResponse, metodo: PaymentMethod): void {
    this.escolhendoId.set(null);
    this.falhouId.set(null);
    this.processandoId.set(reserva.id);

    // Chave nova a cada tentativa: protege contra reenvio acidental da mesma requisicao,
    // sem impedir uma segunda tentativa legitima depois de uma recusa.
    const chave = crypto.randomUUID();

    this.paymentService.checkout({ reservationId: reserva.id, method: metodo }, chave).subscribe({
      next: (pagamento) => this.acompanhar(pagamento.id, reserva.id),
      error: () => this.falhar(reserva.id),
    });
  }

  cancelar(id: string): void {
    this.cancelandoId.set(id);
    this.reservationService.cancel(id).subscribe({
      next: () => {
        this.reservas.update((lista) =>
          lista.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' as const } : r)),
        );
        this.cancelandoId.set(null);
      },
      error: () => this.cancelandoId.set(null),
    });
  }

  // O pagamento roda em segundo plano (RabbitMQ + webhook), entao perguntamos o
  // status a cada 1,5s ate aprovar, recusar ou estourar ~21s.
  private acompanhar(pagamentoId: string, reservaId: string): void {
    const maxTentativas = 14;
    let tentativas = 0;

    this.cobranca?.unsubscribe();
    this.cobranca = interval(1500)
      .pipe(switchMap(() => this.paymentService.getPayment(pagamentoId)))
      .subscribe({
        next: (pagamento) => {
          tentativas++;
          if (pagamento.status === 'APPROVED') {
            this.cobranca?.unsubscribe();
            this.processandoId.set(null);
            this.carregar();
          } else if (pagamento.status === 'DECLINED' || tentativas >= maxTentativas) {
            this.cobranca?.unsubscribe();
            this.falhar(reservaId);
          }
        },
        error: () => {
          this.cobranca?.unsubscribe();
          this.falhar(reservaId);
        },
      });
  }

  private falhar(reservaId: string): void {
    this.processandoId.set(null);
    this.falhouId.set(reservaId);
  }

  private carregar(): void {
    this.reservationService.getMyReservations().subscribe({
      next: (dados) => {
        this.reservas.set(dados);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }
}
