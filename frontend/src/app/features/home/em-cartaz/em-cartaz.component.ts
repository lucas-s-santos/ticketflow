import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventResponse } from '../../events/event.model';
import { InclinarDirective } from '../../../shared/directives/inclinar.directive';
import { MagneticoDirective } from '../../../shared/directives/magnetico.directive';

/**
 * Os próximos eventos no fim da home: a história termina e a pessoa já tem
 * onde clicar. Recebe a mesma lista que alimenta a marquise (a home busca uma
 * vez só) e some inteira quando ela vem vazia — API fora do ar não vira erro
 * numa vitrine.
 *
 * <p>Cada cartão inclina seguindo o mouse e a foto aproxima; o clique leva a
 * capa voando até o banner do detalhe, como na lista de eventos (mesmo
 * {@code [state]} e mesmo view-transition-name).
 */
@Component({
  selector: 'app-em-cartaz',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe, UpperCasePipe, InclinarDirective, MagneticoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (destaques().length > 0) {
      <section class="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div class="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <p class="etiqueta text-acento-texto mb-4">Em cartaz</p>
            <h2 class="text-titulo-lg font-semibold text-tinta-900">Escolha o seu lugar</h2>
          </div>
          <a routerLink="/events" class="link text-sm font-semibold">Ver todos os eventos</a>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (ev of destaques(); track ev.id) {
            <a [routerLink]="['/events', ev.id]" [state]="{ capa: ev.coverImageUrl, nome: ev.name }"
               (click)="nomearCapa($event)"
               appInclinar class="cartaz group bilhete overflow-hidden flex flex-col"
               style="--recorte-y: 14rem">

              <div data-capa class="relative h-56 overflow-hidden bg-tinta-900">
                @if (ev.coverImageUrl) {
                  <img [src]="ev.coverImageUrl" [alt]="'Imagem de ' + ev.name" loading="lazy" decoding="async"
                       class="cartaz-foto w-full h-full object-cover" />
                }
                <span class="absolute top-4 left-4 etiqueta bg-papel-50 text-tinta-900 px-2 py-1">
                  {{ ev.date | date:'dd MMM':undefined:'pt-BR' | uppercase }}
                </span>
              </div>

              <div class="perfuracao"></div>

              <div class="px-6 py-5 flex-1 flex flex-col">
                <p class="etiqueta leading-relaxed text-tinta-400 mb-2 linhas-2">{{ ev.location }}</p>
                <h3 class="text-titulo-sm font-semibold text-tinta-900 mb-4 linhas-2">{{ ev.name }}</h3>
                <div class="mt-auto flex items-end justify-between gap-3">
                  @if (esgotado(ev)) {
                    <span class="selo-neutro">Esgotado</span>
                  } @else {
                    <p>
                      <span class="etiqueta text-tinta-400 block mb-1">A partir de</span>
                      <span class="numero text-lg font-bold text-acento-texto">
                        {{ menorPreco(ev) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                      </span>
                    </p>
                  }
                  <span class="cartaz-seta text-sm font-semibold text-tinta-900" aria-hidden="true">
                    Ver ingressos <span class="inline-block">→</span>
                  </span>
                </div>
              </div>
            </a>
          }
        </div>

        <div class="mt-12 flex justify-center">
          <a routerLink="/events" appMagnetico class="btn-principal">Ver todos os eventos</a>
        </div>
      </section>
    }
  `,
})
export class EmCartazComponent {

  readonly eventos = input<readonly EventResponse[]>([]);

  /** Três bastam: uma vitrine, não a lista inteira (ela tem página própria). */
  readonly destaques = computed(() => this.eventos().slice(0, 3));

  /** Mesma regra da lista de eventos: ignora setor esgotado no "a partir de". */
  menorPreco(ev: EventResponse): number {
    const disponiveis = ev.sectors.filter((s) => s.availableSeats > 0);
    const considerados = disponiveis.length > 0 ? disponiveis : ev.sectors;
    return considerados.reduce((min, s) => Math.min(min, s.price), Infinity);
  }

  esgotado(ev: EventResponse): boolean {
    return ev.sectors.length > 0 && ev.sectors.every((s) => s.availableSeats === 0);
  }

  /** Só a capa clicada ganha o nome da transição: dois com o mesmo nome a cancelam. */
  nomearCapa(evento: MouseEvent): void {
    const link = evento.currentTarget as HTMLElement;
    document.querySelectorAll<HTMLElement>('[data-capa]').forEach((el) => {
      el.style.removeProperty('view-transition-name');
    });
    link.querySelector<HTMLElement>('[data-capa]')?.style.setProperty('view-transition-name', 'capa-evento');
  }
}
