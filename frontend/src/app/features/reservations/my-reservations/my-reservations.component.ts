import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { QRCodeModule } from 'angularx-qrcode';
import { interval, switchMap } from 'rxjs';
import { ReservationService } from '../reservation.service';
import { ReservationResponse } from '../reservation.model';
import { PaymentService } from '../../payments/payment.service';
import { PaymentMethod } from '../../payments/payment.model';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, QRCodeModule],
  template: `
    <div class="max-w-4xl mx-auto px-6 py-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Minhas Reservas</h2>

      @if (loading()) {
        <p class="text-gray-500">Carregando reservas...</p>
      } @else if (reservations().length === 0) {
        <div class="text-center py-16 text-gray-400">
          <p class="text-lg">Você ainda não tem reservas.</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (r of reservations(); track r.id) {
            <div class="bg-white border border-gray-200 rounded-xl p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-base font-semibold text-gray-900 truncate">{{ r.eventName }}</span>
                    <span [class]="statusClass(r.status)" class="text-xs font-medium px-2 py-0.5 rounded-full">
                      {{ statusLabel(r.status) }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500">
                    {{ r.sectorName }} · {{ r.quantity }} ingresso(s) ·
                    {{ r.totalPrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </p>
                  <p class="text-xs text-gray-400 mt-1">
                    Reservado em {{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}
                    @if (r.status === 'PENDING') {
                      · Expira em {{ r.expiresAt | date:'HH:mm' }}
                    }
                  </p>
                </div>

                @if (r.status === 'PENDING') {
                  <div class="shrink-0 flex items-center gap-3">
                    @if (processingId() === r.id) {
                      <span class="text-sm text-indigo-600 font-medium flex items-center gap-2">
                        <span class="inline-block w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                        Processando...
                      </span>
                    } @else if (payingId() === r.id) {
                      <span class="text-sm text-gray-500">Pagar com:</span>
                      <button (click)="checkout(r, 'PIX')"
                        class="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors">
                        Pix
                      </button>
                      <button (click)="checkout(r, 'CREDIT_CARD')"
                        class="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors">
                        Cartão
                      </button>
                      <button (click)="payingId.set(null)"
                        class="text-sm text-gray-400 hover:text-gray-600">
                        ✕
                      </button>
                    } @else {
                      <button (click)="startPaying(r.id)"
                        class="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                        Pagar
                      </button>
                      <button (click)="cancel(r.id)" [disabled]="cancelling() === r.id"
                        class="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 transition-colors">
                        {{ cancelling() === r.id ? 'Cancelando...' : 'Cancelar' }}
                      </button>
                    }
                  </div>
                } @else if (r.status === 'CONFIRMED' && r.ticketToken) {
                  <button (click)="toggleTicket(r.id)"
                    class="shrink-0 text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 font-medium transition-colors">
                    {{ showingTicketId() === r.id ? 'Ocultar ingresso' : 'Ver ingresso' }}
                  </button>
                }
              </div>

              @if (errorId() === r.id) {
                <p class="mt-3 text-sm text-red-600">
                  Pagamento recusado ou não concluído. Tente novamente.
                </p>
              }

              <!-- Ingresso com QR code -->
              @if (showingTicketId() === r.id && r.ticketToken) {
                <div class="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
                  @if (r.checkedInAt) {
                    <div class="mb-3 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                      Ingresso utilizado em {{ r.checkedInAt | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                  } @else {
                    <p class="text-sm text-gray-500 mb-3">Apresente este QR na entrada do evento</p>
                  }
                  <qrcode [qrdata]="r.ticketToken" [width]="200" [errorCorrectionLevel]="'M'"></qrcode>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MyReservationsComponent implements OnInit {
  private readonly reservationService = inject(ReservationService);
  private readonly paymentService = inject(PaymentService);

  reservations = signal<ReservationResponse[]>([]);
  loading = signal(true);
  cancelling = signal<string | null>(null);

  payingId = signal<string | null>(null);      // reserva com seletor de método aberto
  processingId = signal<string | null>(null);  // reserva com pagamento em polling
  errorId = signal<string | null>(null);       // reserva com pagamento recusado/falho
  showingTicketId = signal<string | null>(null); // reserva com QR do ingresso aberto

  ngOnInit(): void {
    this.load();
  }

  startPaying(id: string): void {
    this.errorId.set(null);
    this.payingId.set(id);
  }

  toggleTicket(id: string): void {
    this.showingTicketId.set(this.showingTicketId() === id ? null : id);
  }

  checkout(reservation: ReservationResponse, method: PaymentMethod): void {
    this.payingId.set(null);
    this.errorId.set(null);
    this.processingId.set(reservation.id);

    // Nova chave por tentativa de checkout. Protege contra reenvio acidental da mesma requisição.
    const idempotencyKey = crypto.randomUUID();

    this.paymentService
      .checkout({ reservationId: reservation.id, method }, idempotencyKey)
      .subscribe({
        next: (payment) => this.pollPayment(payment.id, reservation.id),
        error: () => this.failPayment(reservation.id),
      });
  }

  cancel(id: string): void {
    this.cancelling.set(id);
    this.reservationService.cancel(id).subscribe({
      next: () => {
        this.reservations.update(list =>
          list.map(r => r.id === id ? { ...r, status: 'CANCELLED' as const } : r)
        );
        this.cancelling.set(null);
      },
      error: () => this.cancelling.set(null),
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING:   'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      EXPIRED:   'bg-gray-100 text-gray-600',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING:   'Pendente',
      CONFIRMED: 'Confirmado',
      EXPIRED:   'Expirado',
      CANCELLED: 'Cancelado',
    };
    return map[status] ?? status;
  }

  // Pergunta o status do pagamento a cada 1,5s até aprovar/recusar (ou timeout ~21s).
  // O processamento é assíncrono no backend (RabbitMQ), por isso o polling.
  private pollPayment(paymentId: string, reservationId: string): void {
    const maxPolls = 14;
    let polls = 0;

    const sub = interval(1500)
      .pipe(switchMap(() => this.paymentService.getPayment(paymentId)))
      .subscribe({
        next: (payment) => {
          polls++;
          if (payment.status === 'APPROVED') {
            sub.unsubscribe();
            this.processingId.set(null);
            this.load(); // reserva agora CONFIRMED
          } else if (payment.status === 'DECLINED' || polls >= maxPolls) {
            sub.unsubscribe();
            this.failPayment(reservationId);
          }
        },
        error: () => {
          sub.unsubscribe();
          this.failPayment(reservationId);
        },
      });
  }

  private failPayment(reservationId: string): void {
    this.processingId.set(null);
    this.errorId.set(reservationId);
  }

  private load(): void {
    this.reservationService.getMyReservations().subscribe({
      next: (data) => {
        this.reservations.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
