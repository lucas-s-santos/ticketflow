import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { EventService } from '../event.service';
import { EventResponse } from '../event.model';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink],
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
            <p class="text-indigo-600 font-medium mt-1">
              {{ event()!.date | date:'dd/MM/yyyy HH:mm' }}
            </p>
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
          <div class="overflow-hidden rounded-xl border border-gray-200">
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
        }
      }
    </div>
  `,
})
export class EventDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  readonly authService = inject(AuthService);

  event = signal<EventResponse | null>(null);
  loading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventService.getEventById(id).subscribe({
      next: (data) => {
        this.event.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
