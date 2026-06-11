import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EventService } from '../event.service';
import { EventResponse } from '../event.model';

// signal(): estado reativo do Angular 17+.
// Quando o valor de um signal muda, o Angular atualiza APENAS os trechos do template que o usam,
// sem precisar verificar o componente inteiro (mais eficiente que propriedades comuns).
@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="max-w-6xl mx-auto px-6 py-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Próximos Eventos</h2>

      @if (loading()) {
        <p class="text-gray-500">Carregando eventos...</p>
      } @else if (error()) {
        <p class="text-red-600">Erro ao carregar eventos. Tente novamente.</p>
      } @else if (events().length === 0) {
        <p class="text-gray-500">Nenhum evento disponível no momento.</p>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (event of events(); track event.id) {
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ event.name }}</h3>
              <p class="text-sm text-indigo-600 font-medium mb-2">
                {{ event.date | date:'dd/MM/yyyy HH:mm' }}
              </p>
              <p class="text-sm text-gray-500 mb-3">{{ event.location }}</p>
              @if (event.description) {
                <p class="text-sm text-gray-700 line-clamp-2">{{ event.description }}</p>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class EventsListComponent implements OnInit {
  private readonly eventService = inject(EventService);

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
