import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A metade escura das telas de conta no desktop: uma foto do Canhoto com uma
 * frase e o que a pessoa ganha ao entrar. Ocupava espaço vazio — o formulário
 * sozinho no meio de uma tela larga.
 *
 * <p>No celular o host fica escondido (hidden lg:flex em quem usa), e a foto,
 * com loading="lazy" dentro de um elemento sem exibição, nem é baixada.
 */
@Component({
  selector: 'app-painel-conta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative isolate overflow-hidden bg-tinta-900 text-papel-50 flex-col justify-end' },
  template: `
    <img [src]="imagem()" alt="" loading="lazy" decoding="async"
         class="absolute inset-0 -z-10 w-full h-full object-cover animate-assentar"
         [style.object-position]="enquadre()" />
    <div class="absolute inset-0 -z-10 bg-gradient-to-t from-tinta-900 via-tinta-900/70 to-tinta-900/10" aria-hidden="true"></div>

    <div class="px-12 xl:px-16 py-14 max-w-xl">
      <p class="etiqueta text-acento-500 mb-5">Canhoto</p>
      <p class="font-display text-titulo-lg font-semibold mb-8">{{ titulo() }}</p>
      <ul class="space-y-4">
        @for (item of itens(); track item) {
          <li class="flex items-start gap-3 text-papel-300 leading-relaxed">
            <span class="mt-2 w-2 h-2 shrink-0 bg-acento-500" aria-hidden="true"></span>
            {{ item }}
          </li>
        }
      </ul>
    </div>
  `,
})
export class PainelContaComponent {
  readonly imagem = input.required<string>();
  /** object-position da foto: o painel é alto e estreito, e corta as laterais. */
  readonly enquadre = input('50% 50%');
  readonly titulo = input.required<string>();
  readonly itens = input.required<readonly string[]>();
}
