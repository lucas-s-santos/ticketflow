import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';
import { gsap } from 'gsap';

/** Só com ponteiro que paira de verdade: no toque, "seguir o mouse" não existe. */
const PONTEIRO_FINO = '(hover: hover) and (pointer: fine)';

/**
 * Inclina o elemento na direção do mouse, como um ingresso segurado na mão, e
 * passa um reflexo por cima seguindo o cursor.
 *
 * <p>Com {@code [inclinacao]="0"} sobra só o reflexo — o "holofote" dos
 * cartões escuros. A cor do reflexo vem de {@code brilho}: {@code 'papel'}
 * (luz branca, para fotos) ou {@code 'acento'} (verde da marca, para fundo escuro).
 *
 * <p>O reflexo é um círculo de gradiente movido por {@code transform}, não um
 * background reposicionado: mover background repinta o cartão inteiro a cada
 * movimento do mouse, transform só recompõe a camada. O elemento precisa de
 * {@code overflow-hidden} (ou da máscara do .bilhete) para recortar o reflexo.
 *
 * <p>Nada acontece no toque nem com {@code prefers-reduced-motion}. Use num
 * elemento sem outro transform: dois efeitos no mesmo transform se sobrescrevem.
 */
@Directive({
  selector: '[appInclinar]',
  standalone: true,
})
export class InclinarDirective implements OnDestroy {

  /** Inclinação máxima, em graus, quando o mouse está na borda. */
  readonly inclinacao = input(6);
  readonly brilho = input<'papel' | 'acento'>('papel');

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zona = inject(NgZone);
  private desligar?: () => void;

  constructor() {
    afterNextRender(() => {
      if (!matchMedia(PONTEIRO_FINO).matches || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      this.zona.runOutsideAngular(() => this.ligar());
    });
  }

  ngOnDestroy(): void {
    this.desligar?.();
  }

  private ligar(): void {
    const alvo = this.elemento.nativeElement;
    const graus = this.inclinacao();

    const reflexo = document.createElement('span');
    reflexo.className = `reflexo reflexo-${this.brilho()}`;
    reflexo.setAttribute('aria-hidden', 'true');
    alvo.appendChild(reflexo);
    if (getComputedStyle(alvo).position === 'static') {
      alvo.style.position = 'relative';
    }

    // Sem inclinação, o transform do elemento fica intocado (só o reflexo anda).
    const semGiro = (_graus: number) => undefined;
    if (graus) gsap.set(alvo, { transformPerspective: 900 });
    const girarX = graus ? gsap.quickTo(alvo, 'rotationX', { duration: 0.5, ease: 'power3.out' }) : semGiro;
    const girarY = graus ? gsap.quickTo(alvo, 'rotationY', { duration: 0.5, ease: 'power3.out' }) : semGiro;
    const moverX = gsap.quickTo(reflexo, 'x', { duration: 0.3, ease: 'power3.out' });
    const moverY = gsap.quickTo(reflexo, 'y', { duration: 0.3, ease: 'power3.out' });

    const aoMover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const caixa = alvo.getBoundingClientRect();
      const fx = (e.clientX - caixa.left) / caixa.width;   // 0 a 1
      const fy = (e.clientY - caixa.top) / caixa.height;
      girarY((fx - 0.5) * 2 * graus);
      girarX((0.5 - fy) * 2 * graus);
      // O reflexo tem 320px; o centro dele fica sob o cursor.
      moverX(e.clientX - caixa.left - 160);
      moverY(e.clientY - caixa.top - 160);
    };
    const aoEntrar = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      gsap.to(reflexo, { opacity: 1, duration: 0.25, ease: 'power3.out', overwrite: 'auto' });
      aoMover(e);
    };
    const aoSair = () => {
      girarX(0);
      girarY(0);
      gsap.to(reflexo, { opacity: 0, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
    };

    alvo.addEventListener('pointerenter', aoEntrar);
    alvo.addEventListener('pointermove', aoMover);
    alvo.addEventListener('pointerleave', aoSair);

    this.desligar = () => {
      alvo.removeEventListener('pointerenter', aoEntrar);
      alvo.removeEventListener('pointermove', aoMover);
      alvo.removeEventListener('pointerleave', aoSair);
      gsap.killTweensOf([alvo, reflexo]);
      reflexo.remove();
    };
  }
}
