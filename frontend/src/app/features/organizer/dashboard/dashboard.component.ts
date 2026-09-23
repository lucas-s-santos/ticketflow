import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrganizerService } from '../organizer.service';
import { OrganizerDashboard } from '../organizer.model';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto px-6 py-12 md:py-16">

      <div class="flex flex-wrap items-end justify-between gap-4 mb-12">
        <div>
          <p class="etiqueta text-acento-texto mb-3">Organizador</p>
          <h1 class="text-titulo-lg font-semibold text-tinta-900">Painel de vendas</h1>
        </div>
        <div class="flex gap-2">
          <a routerLink="/organizer/validate" class="btn-tinta btn-pequeno">Portaria</a>
          <a routerLink="/events/new" class="btn-contorno btn-pequeno">+ Criar evento</a>
        </div>
      </div>

      @if (carregando()) {
        <div class="grid gap-px sm:grid-cols-3 bg-papel-300 border border-papel-300 animate-pulse" aria-hidden="true">
          @for (vazio of [1, 2, 3]; track vazio) {
            <div class="bg-papel-50 p-7 h-32"></div>
          }
        </div>
        <p class="sr-only">Carregando painel</p>

      } @else if (erro()) {
        <div class="aviso-erro">Não foi possível carregar o painel.</div>

      } @else if (dados()) {
        @if (dados(); as d) {

        <!-- ================= TOTAIS ================= -->
        <!-- gap-px sobre fundo escuro cria as divisorias, sem bordas duplicadas -->
        <div class="grid gap-px sm:grid-cols-3 bg-papel-300 border border-papel-300 mb-14">
          <div class="bg-papel-50 p-7">
            <p class="etiqueta text-tinta-400 mb-3">Eventos</p>
            <p class="numero text-titulo-md font-bold text-tinta-900 leading-none">{{ d.totalEvents }}</p>
          </div>
          <div class="bg-papel-50 p-7">
            <p class="etiqueta text-tinta-400 mb-3">Ingressos vendidos</p>
            <p class="numero text-titulo-md font-bold text-tinta-900 leading-none">{{ d.totalTicketsSold }}</p>
          </div>
          <div class="bg-papel-50 p-7">
            <p class="etiqueta text-tinta-400 mb-3">Receita</p>
            <p class="numero text-titulo-md font-bold text-acento-texto leading-none">
              {{ d.totalRevenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </p>
          </div>
        </div>

        @if (d.events.length === 0) {
          <div class="bilhete p-12 text-center max-w-md" style="--recorte-y: 50%">
            <p class="font-display text-titulo-sm font-semibold text-tinta-900 mb-2">
              Nenhum evento publicado
            </p>
            <p class="text-sm text-tinta-500 mb-7">
              Crie o primeiro e ele aparece aqui com as vendas em tempo real.
            </p>
            <a routerLink="/events/new" class="btn-principal">Criar meu primeiro evento</a>
          </div>

        } @else {
          <div class="space-y-12">
            @for (ev of d.events; track ev.eventId) {
              <section>
                <div class="flex flex-wrap items-end justify-between gap-4 pb-4 border-b-2 border-tinta-900">
                  <div>
                    <h2 class="font-display text-titulo-sm font-semibold text-tinta-900">{{ ev.eventName }}</h2>
                    <p class="etiqueta text-tinta-400 mt-1.5">
                      {{ ev.date | date:'dd MMM yyyy · HH:mm':undefined:'pt-BR' | uppercase }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="numero text-lg font-bold text-tinta-900">
                      {{ ev.totalSold }}<span class="text-tinta-400">/{{ ev.totalCapacity }}</span>
                    </p>
                    <p class="numero text-sm font-semibold text-acento-texto mt-0.5">
                      {{ ev.revenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </p>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-sm min-w-[36rem]">
                    <thead>
                      <tr class="border-b border-papel-300">
                        <th class="etiqueta text-tinta-400 py-3 pr-4 text-left font-normal">Setor</th>
                        <th class="etiqueta text-tinta-400 py-3 px-4 text-right font-normal">Vendidos</th>
                        <th class="etiqueta text-tinta-400 py-3 px-4 text-right font-normal">Restam</th>
                        <th class="etiqueta text-tinta-400 py-3 px-4 text-left font-normal w-40">Ocupação</th>
                        <th class="etiqueta text-tinta-400 py-3 pl-4 text-right font-normal">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of ev.sectors; track s.sectorName) {
                        <tr class="border-b border-papel-200">
                          <td class="py-3.5 pr-4 font-medium text-tinta-900">{{ s.sectorName }}</td>
                          <td class="py-3.5 px-4 text-right numero text-tinta-700">
                            {{ s.sold }}<span class="text-tinta-400">/{{ s.capacity }}</span>
                          </td>
                          <td class="py-3.5 px-4 text-right numero"
                              [class]="s.available === 0 ? 'text-erro-600 font-bold' : 'text-tinta-500'">
                            {{ s.available === 0 ? 'esgotado' : s.available }}
                          </td>
                          <td class="py-3.5 px-4">
                            <div class="flex items-center gap-2.5">
                              <div class="flex-1 h-1.5 bg-papel-300 overflow-hidden">
                                <div class="h-full bg-acento-500" [style.width.%]="ocupacao(s.sold, s.capacity)"></div>
                              </div>
                              <span class="numero text-xs text-tinta-400 w-9 text-right">
                                {{ ocupacao(s.sold, s.capacity) | number:'1.0-0' }}%
                              </span>
                            </div>
                          </td>
                          <td class="py-3.5 pl-4 text-right numero text-tinta-700">
                            {{ s.revenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }
          </div>
        }
        }
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly service = inject(OrganizerService);

  readonly dados = signal<OrganizerDashboard | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);

  ngOnInit(): void {
    this.service.getDashboard().subscribe({
      next: (d) => {
        this.dados.set(d);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  ocupacao(vendidos: number, capacidade: number): number {
    return capacidade > 0 ? (vendidos / capacidade) * 100 : 0;
  }
}
