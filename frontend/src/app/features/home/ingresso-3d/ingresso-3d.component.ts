import {
  ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input, output,
} from '@angular/core';
import type { CenaIngresso } from './ingresso-3d.cena';
import type { Parada } from './roteiro';

/**
 * O ingresso do Canhoto em 3D, viajando pela home conforme a rolagem.
 *
 * <p>O componente é só a moldura: a cena (Three.js + GSAP) vive em
 * ingresso-3d.cena.ts e é importada dinamicamente. Os {@code import type} acima
 * somem na compilação — se fossem imports normais, o Three.js inteiro entraria
 * no pacote da home e atrasaria a primeira pintura.
 *
 * <p>Ele não ocupa lugar no layout: o canvas é fixo na janela e vai até as
 * âncoras ({@code data-ancora}) que a página espalha pelas seções, na ordem do
 * {@link roteiro}. A primeira âncora é o hero, que também recebe o arraste.
 */
@Component({
  selector: 'app-ingresso-3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: '',
})
export class Ingresso3dComponent implements OnDestroy {

  /** As paradas da viagem, na ordem da página. */
  readonly roteiro = input.required<readonly Parada[]>();

  /** Sem WebGL: o ingresso virou imagem chapada no hero e não vai viajar. */
  readonly semViagem = output<void>();

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);

  private cena?: CenaIngresso;
  private destruido = false;

  constructor() {
    // afterNextRender: só no navegador e só depois de o DOM existir, para as
    // âncoras já estarem no lugar quando a cena as procurar.
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

    const host = this.elemento.nativeElement as HTMLElement;
    const cena = await montarCena(host, {
      movimentoReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      roteiro: this.roteiro(),
      raiz: host.parentElement ?? document.body,
    });
    if (this.destruido) {
      cena.destruir();
      return;
    }
    this.cena = cena;
    if (cena.semWebGL) {
      this.zona.run(() => this.semViagem.emit());
    }
  }
}
