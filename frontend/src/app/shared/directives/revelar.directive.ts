import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Revela o elemento quando ele entra na tela: sobe alguns pixels e aparece.
 *
 * <p>Usa IntersectionObserver, não scroll: o navegador avisa quando o elemento
 * cruza a borda da janela, em vez de nós recalcularmos posição a cada quadro.
 *
 * <p>É de um disparo só. Elemento que reaparece a cada vez que volta à tela
 * cansa, e atrapalha quem rola de volta para reler algo.
 *
 * <p>O estado inicial é aplicado por JavaScript, não por CSS. Se o script
 * falhar ou demorar, o conteúdo simplesmente aparece — em vez de ficar
 * invisível para sempre, que é como esse efeito costuma quebrar.
 */
@Directive({
  selector: '[appRevelar]',
  standalone: true,
})
export class RevelarDirective implements OnInit, OnDestroy {

  /** Atraso em ms. Num laço, use o índice para escalonar os itens. */
  readonly atraso = input(0);

  /** Quanto o elemento sobe ao aparecer, em px. */
  readonly distancia = input(14);

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);
  private observador?: IntersectionObserver;

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const alvo = this.elemento.nativeElement;
    alvo.style.opacity = '0';
    alvo.style.transform = `translateY(${this.distancia()}px)`;
    alvo.style.transition = `opacity 620ms cubic-bezier(0.22, 1, 0.36, 1) ${this.atraso()}ms,
                             transform 620ms cubic-bezier(0.22, 1, 0.36, 1) ${this.atraso()}ms`;

    this.zona.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting) {
            return;
          }
          alvo.style.opacity = '1';
          alvo.style.transform = 'translateY(0)';
          // Depois de revelado não há mais nada a observar.
          this.observador?.disconnect();
        },
        // 12% do elemento visível: dispara quando ele entrou de verdade,
        // não no instante em que a primeira linha encosta na borda.
        { threshold: 0.12 },
      );
      this.observador.observe(alvo);
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }
}
