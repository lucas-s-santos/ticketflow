import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrganizerService } from '../organizer.service';
import { OrganizerDashboard } from '../organizer.model';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Painel do Organizador</h2>
        <a routerLink="/organizer/validate"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          Validar ingresso
        </a>
      </div>

      @if (loading()) {
        <p class="text-gray-500">Carregando painel...</p>
      } @else if (error()) {
        <p class="text-red-600">Erro ao carregar o painel.</p>
      } @else if (data()) {
        @if (data(); as d) {
        <!-- Cartões de totais -->
        <div class="grid gap-4 sm:grid-cols-3 mb-8">
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <p class="text-sm text-gray-500">Eventos</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">{{ d.totalEvents }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <p class="text-sm text-gray-500">Ingressos vendidos</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">{{ d.totalTicketsSold }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <p class="text-sm text-gray-500">Receita</p>
            <p class="text-3xl font-bold text-green-600 mt-1">
              {{ d.totalRevenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </p>
          </div>
        </div>

        @if (d.events.length === 0) {
          <div class="text-center py-16 text-gray-400">
            <p class="text-lg">Você ainda não criou eventos.</p>
            <a routerLink="/events/new" class="text-indigo-600 hover:underline mt-2 inline-block">Criar meu primeiro evento</a>
          </div>
        } @else {
          <div class="space-y-6">
            @for (ev of d.events; track ev.eventId) {
              <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 class="font-semibold text-gray-900">{{ ev.eventName }}</h3>
                    <p class="text-xs text-gray-500">{{ ev.date | date:'dd/MM/yyyy HH:mm' }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-gray-500">{{ ev.totalSold }} / {{ ev.totalCapacity }} vendidos</p>
                    <p class="text-sm font-semibold text-green-600">
                      {{ ev.revenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </p>
                  </div>
                </div>
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                    <tr>
                      <th class="px-5 py-2 text-left">Setor</th>
                      <th class="px-5 py-2 text-right">Vendidos</th>
                      <th class="px-5 py-2 text-right">Disponíveis</th>
                      <th class="px-5 py-2 text-left">Ocupação</th>
                      <th class="px-5 py-2 text-right">Receita</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    @for (s of ev.sectors; track s.sectorName) {
                      <tr>
                        <td class="px-5 py-2 font-medium text-gray-900">{{ s.sectorName }}</td>
                        <td class="px-5 py-2 text-right text-gray-700">{{ s.sold }} / {{ s.capacity }}</td>
                        <td class="px-5 py-2 text-right text-gray-500">{{ s.available }}</td>
                        <td class="px-5 py-2">
                          <div class="w-full bg-gray-100 rounded-full h-2">
                            <div class="bg-indigo-600 h-2 rounded-full"
                              [style.width.%]="occupancy(s.sold, s.capacity)"></div>
                          </div>
                          <span class="text-xs text-gray-400">{{ occupancy(s.sold, s.capacity) | number:'1.0-0' }}%</span>
                        </td>
                        <td class="px-5 py-2 text-right text-gray-700">
                          {{ s.revenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
        }
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly organizerService = inject(OrganizerService);

  data = signal<OrganizerDashboard | null>(null);
  loading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    this.organizerService.getDashboard().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  occupancy(sold: number, capacity: number): number {
    return capacity > 0 ? (sold / capacity) * 100 : 0;
  }
}
