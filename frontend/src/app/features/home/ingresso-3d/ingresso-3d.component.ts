import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject } from '@angular/core';
import type { CenaIngresso } from './ingresso-3d.cena';

/**
 * O ingresso do Canhoto em 3D, girando no hero.
 *
 * <p>O componente é só a moldura: a cena (Three.js + GSAP) vive em
 * ingresso-3d.cena.ts e é importada dinamicamente. O {@code import type} acima
 * some na compilação — se fosse um import normal, o Three.js inteiro entraria
 * no pacote da home e atrasaria a primeira pintura.
 *
 * <p>O tamanho vem de quem usa: o componente ocupa a caixa que receber.
 */
@Component({
  selector: 'app-ingresso-3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block select-none',
    role: 'img',
    'aria-label': 'Ingresso do Canhoto em 3D: frente preta com QR code e selo holográfico, verso verde.',
  },
  // Duas camadas na dica de propósito: a de fora aparece na entrada e some no
  // primeiro arraste; a de dentro some com a rolagem. Numa camada só, uma
  // animação sobrescreveria a opacidade da outra.
  template: `
    <p data-dica class="hidden lg:block absolute bottom-[17%] inset-x-0 text-center pointer-events-none opacity-0"
       aria-hidden="true">
      <span data-dica-rolagem class="etiqueta text-papel-50/40">Arraste para girar</span>
    </p>
  `,
})
export class Ingresso3dComponent implements OnDestroy {

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);

  private cena?: CenaIngresso;
  private destruido = false;

  constructor() {
    // afterNextRender: só no navegador e só depois de o DOM existir, para o
    // canvas nascer com o tamanho certo.
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => void this.montar());
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.cena?.destruir();
  }

  private async montar(): Promise<void> {
    const { montarCena } = await import('./ingresso-3d.cena');
    // A pessoa pode ter saído da home enquanto o Three.js baixava.
    if (this.destruido) return;

    const cena = await montarCena(this.elemento.nativeElement, {
      movimentoReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    if (this.destruido) {
      cena.destruir();
      return;
    }
    this.cena = cena;
  }
}
