import { Component, computed, input } from '@angular/core';

/**
 * Faixa de texto deslizando, no espírito da marquise de cinema — o letreiro da
 * fachada que anuncia o que está em cartaz.
 *
 * <p>A lista é duplicada e a trilha desliza exatamente 50% da própria largura.
 * Quando a animação reinicia, a segunda cópia está no lugar em que a primeira
 * começou, e a emenda não aparece. É o que faz o rolo parecer infinito sem
 * JavaScript nenhum.
 *
 * <p>A cópia é marcada como {@code aria-hidden}: para quem usa leitor de tela,
 * ouvir a mesma lista duas vezes seria ruído.
 */
@Component({
  selector: 'app-marquise',
  standalone: true,
  template: `
    <div class="relative overflow-hidden border-y border-papel-300 bg-tinta-900 py-4 select-none">
      <div class="flex w-max animate-deslizar hover:[animation-play-state:paused]"
           [style.animation-duration]="duracao()">

        @for (copia of [1, 2]; track copia) {
          <ul class="flex shrink-0 items-center" [attr.aria-hidden]="copia === 2 ? 'true' : null">
            @for (item of itens(); track $index) {
              <li class="flex items-center gap-8 px-8">
                <span class="font-display text-titulo-sm font-semibold text-papel-50 whitespace-nowrap">
                  {{ item }}
                </span>
                <!-- O recorte do ingresso separando um nome do outro -->
                <svg viewBox="0 0 20 14" class="w-5 h-3.5 shrink-0" aria-hidden="true">
                  <path class="fill-acento-500"
                        d="M2 1h16a1 1 0 0 1 1 1v2.2a2.4 2.4 0 0 0 0 4.8V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V9a2.4 2.4 0 0 0 0-4.8V2a1 1 0 0 1 1-1Z" />
                </svg>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class MarquiseComponent {

  readonly itens = input.required<string[]>();

  /** Segundos por volta completa. Mais itens exigem mais tempo para manter o ritmo. */
  readonly segundosPorItem = input(4.5);

  readonly duracao = computed(() => `${Math.max(18, this.itens().length * this.segundosPorItem())}s`);
}
