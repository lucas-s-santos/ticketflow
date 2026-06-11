import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../event.service';
import { EventResponse, TicketSectorResponse } from '../event.model';
import { AuthService } from '../../auth/auth.service';
import { ReservationService } from '../../reservations/reservation.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-6 py-10">
      @if (loading()) {
        <p class="text-gray-500">Carregando evento...</p>
      } @else if (error()) {
        <p class="text-red-600">Evento não encontrado.</p>
      } @else if (event()) {
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <a routerLink="/events" class="text-sm text-indigo-600 hover:underline mb-2 inline-block">← Voltar</a>
            <h1 class="text-3xl font-bold text-gray-900">{{ event()!.name }}</h1>
            <p class="text-indigo-600 font-medium mt-1">{{ event()!.date | date:'dd/MM/yyyy HH:mm' }}</p>
            <p class="text-gray-500 mt-0.5">{{ event()!.location }}</p>
          </div>
          @if (authService.isOrganizador()) {
            <a
              [routerLink]="['/events', event()!.id, 'edit']"
              class="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Editar
            </a>
          }
        </div>

        @if (event()!.description) {
          <p class="text-gray-700 mb-8 leading-relaxed">{{ event()!.description }}</p>
        }

        <h2 class="text-xl font-semibold text-gray-900 mb-4">Setores e Ingressos</h2>

        @if (event()!.sectors.length === 0) {
          <p class="text-gray-500">Nenhum setor cadastrado para este evento.</p>
        } @else {
          <div class="overflow-hidden rounded-xl border border-gray-200 mb-8">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                <tr>
                  <th class="px-4 py-3 text-left">Setor</th>
                  <th class="px-4 py-3 text-right">Capacidade</th>
                  <th class="px-4 py-3 text-right">Disponíveis</th>
                  <th class="px-4 py-3 text-right">Preço</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (sector of event()!.sectors; track sector.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 font-medium text-gray-900">{{ sector.name }}</td>
                    <td class="px-4 py-3 text-right text-gray-600">{{ sector.capacity }}</td>
                    <td class="px-4 py-3 text-right">
                      <span [class]="sector.availableSeats === 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'">
                        {{ sector.availableSeats === 0 ? 'Esgotado' : sector.availableSeats }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right text-gray-900 font-semibold">
                      {{ sector.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Formulário de reserva — visível apenas para usuários logados -->
          @if (authService.isLoggedIn()) {
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Reservar Ingressos</h3>

              @if (reservationSuccess()) {
                <div class="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
                  Reserva criada! Você tem 15 minutos para concluir o pagamento.
                  <a routerLink="/reservations" class="underline ml-1">Ver minhas reservas</a>
                </div>
              }

              @if (reservationError()) {
                <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {{ reservationError() }}
                </div>
              }

              <div class="flex flex-wrap gap-3 items-end">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                  <select
                    [(ngModel)]="selectedSectorId"
                    class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione...</option>
                    @for (sector of availableSectors(); track sector.id) {
                      <option [value]="sector.id">{{ sector.name }} — {{ sector.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    [(ngModel)]="quantity"
                    min="1"
                    max="10"
                    class="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  (click)="reserve()"
                  [disabled]="reserving() || !selectedSectorId"
                  class="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {{ reserving() ? 'Reservando...' : 'Reservar' }}
                </button>
              </div>
            </div>
          } @else {
            <p class="text-sm text-gray-500 text-center py-4">
              <a routerLink="/login" class="text-indigo-600 hover:underline">Entre na sua conta</a>
              para reservar ingressos.
            </p>
          }
        }
      }
    </div>
  `,
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly reservationService = inject(ReservationService);
  readonly authService = inject(AuthService);

  event = signal<EventResponse | null>(null);
  loading = signal(true);
  error = signal(false);

  selectedSectorId = '';
  quantity = 1;
  reserving = signal(false);
  reservationSuccess = signal(false);
  reservationError = signal('');

  availableSectors = signal<TicketSectorResponse[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventService.getEventById(id).subscribe({
      next: (data) => {
        this.event.set(data);
        this.availableSectors.set(data.sectors.filter(s => s.availableSeats > 0));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  reserve(): void {
    if (!this.selectedSectorId || this.quantity < 1) return;
    this.reserving.set(true);
    this.reservationError.set('');
    this.reservationSuccess.set(false);

    this.reservationService.create({ ticketSectorId: this.selectedSectorId, quantity: this.quantity }).subscribe({
      next: () => {
        this.reservationSuccess.set(true);
        this.reserving.set(false);
        // Recarrega o evento para mostrar vagas atualizadas
        const id = this.route.snapshot.paramMap.get('id')!;
        this.eventService.getEventById(id).subscribe(data => {
          this.event.set(data);
          this.availableSectors.set(data.sectors.filter(s => s.availableSeats > 0));
        });
      },
      error: (err) => {
        this.reservationError.set(err.error?.message ?? 'Erro ao criar reserva. Tente novamente.');
        this.reserving.set(false);
      },
    });
  }
}
