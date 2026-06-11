import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventService } from '../event.service';
import { EventResponse } from '../event.model';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Próximos Eventos</h2>
        @if (authService.isOrganizador()) {
          <a
            routerLink="/events/new"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Criar Evento
          </a>
        }
      </div>

      @if (loading()) {
        <p class="text-gray-500">Carregando eventos...</p>
      } @else if (error()) {
        <p class="text-red-600">Erro ao carregar eventos. Tente novamente.</p>
      } @else if (events().length === 0) {
        <p class="text-gray-500">Nenhum evento disponível no momento.</p>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (event of events(); track event.id) {
            <a
              [routerLink]="['/events', event.id]"
              class="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ event.name }}</h3>
              <p class="text-sm text-indigo-600 font-medium mb-1">
                {{ event.date | date:'dd/MM/yyyy HH:mm' }}
              </p>
              <p class="text-sm text-gray-500 mb-3">{{ event.location }}</p>
              @if (event.description) {
                <p class="text-sm text-gray-700 line-clamp-2 mb-3">{{ event.description }}</p>
              }
              @if (event.sectors.length > 0) {
                <div class="flex flex-wrap gap-2 mt-auto">
                  @for (sector of event.sectors; track sector.id) {
                    <span class="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {{ sector.name }} — {{ sector.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </span>
                  }
                </div>
              }
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class EventsListComponent implements OnInit {
  private readonly eventService = inject(EventService);
  readonly authService = inject(AuthService);

  events = signal<EventResponse[]>([]);
  loading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
