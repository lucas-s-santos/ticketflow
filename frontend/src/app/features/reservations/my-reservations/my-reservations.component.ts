import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';
import { interval, Subscription, switchMap } from 'rxjs';
import { ReservationService } from '../reservation.service';
import { ReservationResponse } from '../reservation.model';
import { PaymentService } from '../../payments/payment.service';
import { PaymentMethod } from '../../payments/payment.model';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, RouterLink, QRCodeModule],
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

            <div class="grid gap-6 md:grid-cols-2">
              @for (r of confirmadas(); track r.id) {
                <article class="bilhete flex flex-col relative" style="--recorte-y: calc(100% - 12rem)">
                  <div class="p-6 flex-1">
                    <div class="flex items-start justify-between gap-3 mb-4">
                      @if (r.checkedInAt) {
                        <span class="selo-neutro">Utilizado</span>
                      } @else {
                        <span class="selo-confirmado">Válido</span>
                      }
                      <span class="etiqueta text-tinta-400 text-right">
                        {{ r.quantity }} {{ r.quantity === 1 ? 'ingresso' : 'ingressos' }}
                      </span>
                    </div>

                    <h3 class="font-display text-titulo-sm font-semibold text-tinta-900 mb-1.5 leading-snug">
                      {{ r.eventName }}
                    </h3>
                    <p class="text-sm text-tinta-500">{{ r.sectorName }}</p>
                  </div>

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

                  <!-- Carimbo sobre o ingresso ja utilizado -->
                  @if (r.checkedInAt) {
                    <div class="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden="true">
                      <span class="carimbo text-erro-500/50 border-erro-500/40">Utilizado</span>
                    </div>
                  }
                </article>
              }
            </div>
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

  ngOnInit(): void {
    this.carregar();
    this.relogio = interval(1000).subscribe(() => this.agora.set(Date.now()));
  }

  ngOnDestroy(): void {
    this.relogio?.unsubscribe();
    this.cobranca?.unsubscribe();
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
