import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevelarDirective } from '../../../shared/directives/revelar.directive';
import { ContagemDirective } from '../../../shared/directives/contagem.directive';
import { OrganizerService } from '../organizer.service';
import { OrganizerDashboard } from '../organizer.model';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe, RouterLink, RevelarDirective, ContagemDirective],
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
        <div class="grid gap-px sm:grid-cols-2 lg:grid-cols-4 bg-papel-300 border border-papel-300 animate-pulse" aria-hidden="true">
          @for (vazio of [1, 2, 3, 4]; track vazio) {
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
        <div class="grid gap-px sm:grid-cols-2 lg:grid-cols-4 bg-papel-300 border border-papel-300 mb-14">
          <div appRevelar class="bg-papel-50 p-7">
            <p class="etiqueta text-tinta-400 mb-3">Eventos</p>
            <p class="numero text-titulo-md font-bold text-tinta-900 leading-none" [appContagem]="d.totalEvents"></p>
          </div>
          <div appRevelar [atraso]="80" class="bg-papel-50 p-7">
            <p class="etiqueta text-tinta-400 mb-3">Ingressos vendidos</p>
            <p class="numero text-titulo-md font-bold text-tinta-900 leading-none" [appContagem]="d.totalTicketsSold"></p>
          </div>
          <div appRevelar [atraso]="160" class="bg-papel-50 p-7">
            <p class="etiqueta text-tinta-400 mb-3">Receita</p>
            <p class="numero text-titulo-md font-bold text-acento-texto leading-none"
               [appContagem]="d.totalRevenue" formato="moeda"></p>
          </div>
          <!-- Quantos dos ingressos vendidos já passaram pela portaria. -->
          <div appRevelar [atraso]="240" class="bg-papel-50 p-7">
            <p class="etiqueta text-tinta-400 mb-3">Check-in</p>
            <p class="numero text-titulo-md font-bold text-tinta-900 leading-none">
              <span [appContagem]="taxaCheckIn(d.totalCheckedIn, d.totalTicketsSold)"></span>%
            </p>
            <p class="text-xs text-tinta-500 mt-2">
              {{ d.totalCheckedIn }} de {{ d.totalTicketsSold }} {{ d.totalTicketsSold === 1 ? 'ingresso entrou' : 'ingressos entraram' }}
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
              <section appRevelar>
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
                    @if (ev.totalSold > 0) {
                      <p class="etiqueta text-tinta-400 mt-1.5">
                        {{ ev.totalCheckedIn }} {{ ev.totalCheckedIn === 1 ? 'entrou' : 'entraram' }}
                        · {{ taxaCheckIn(ev.totalCheckedIn, ev.totalSold) }}%
                      </p>
                    }
                  </div>
                </div>

                <!-- Celular: cada setor numa linha empilhada. A tabela de cinco colunas
                     só cabia rolando para o lado. -->
                <ul class="sm:hidden divide-y divide-papel-200">
                  @for (s of ev.sectors; track s.sectorName) {
                    <li class="py-3.5">
                      <div class="flex items-baseline justify-between gap-3 mb-2">
                        <span class="font-medium text-tinta-900">{{ s.sectorName }}</span>
                        <span class="numero text-sm text-tinta-700 shrink-0">
                          {{ s.revenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                        </span>
                      </div>
                      <div class="flex items-center gap-3">
                        <div class="flex-1 h-1.5 bg-papel-300 overflow-hidden">
                          <div class="barra-ocupacao" [style.transform]="escalaBarra(s.sold, s.capacity)"></div>
                        </div>
                        <span class="numero text-xs shrink-0"
                              [class]="s.available === 0 ? 'text-erro-600 font-bold' : 'text-tinta-500'">
                          {{ s.sold }}/{{ s.capacity }} · {{ s.available === 0 ? 'esgotado' : s.available + ' restam' }}
                        </span>
                      </div>
                    </li>
                  }
                </ul>

                <div class="hidden sm:block overflow-x-auto">
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
                                <div class="barra-ocupacao" [style.transform]="escalaBarra(s.sold, s.capacity)"></div>
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

  /**
   * As barras de ocupação nascem vazias e crescem até o valor logo depois de
   * aparecerem: uma vez, na carga. Sem esse passo o Angular já as desenharia
   * cheias e a transição nunca rodaria.
   */
  private readonly barrasProntas = signal(false);

  ngOnInit(): void {
    this.service.getDashboard().subscribe({
      next: (d) => {
        this.dados.set(d);
        this.carregando.set(false);
        setTimeout(() => this.barrasProntas.set(true), 80);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  /** Fração dos ingressos vendidos que já passou pela portaria, em % inteiro. */
  taxaCheckIn(entraram: number, vendidos: number): number {
    return vendidos > 0 ? Math.round((entraram / vendidos) * 100) : 0;
  }

  ocupacao(vendidos: number, capacidade: number): number {
    return capacidade > 0 ? (vendidos / capacidade) * 100 : 0;
  }

  /** scaleX em vez de width: a barra cresce sem recalcular o layout da tabela. */
  escalaBarra(vendidos: number, capacidade: number): string {
    const fracao = this.barrasProntas() ? this.ocupacao(vendidos, capacidade) / 100 : 0;
    return `scaleX(${fracao.toFixed(4)})`;
  }
}
