import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ReservationService } from '../reservation.service';
import { ReservationResponse } from '../reservation.model';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
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
            <div class="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
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
                <button
                  (click)="cancel(r.id)"
                  [disabled]="cancelling() === r.id"
                  class="shrink-0 text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 transition-colors"
                >
                  {{ cancelling() === r.id ? 'Cancelando...' : 'Cancelar' }}
                </button>
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

  reservations = signal<ReservationResponse[]>([]);
  loading = signal(true);
  cancelling = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  cancel(id: string): void {
    this.cancelling.set(id);
    this.reservationService.cancel(id).subscribe({
      next: () => {
        // Atualiza o status localmente sem nova chamada ao servidor
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
