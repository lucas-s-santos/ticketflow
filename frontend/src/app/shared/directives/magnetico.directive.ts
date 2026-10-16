import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject } from '@angular/core';
import { gsap } from 'gsap';

/** Quanto o botão anda, no máximo, em px. Mais que isso parece que ele foge. */
const MAXIMO = { x: 10, y: 7 };

/**
 * O botão é puxado de leve na direção do cursor e volta ao lugar quando ele sai.
 * Para chamadas principais (CTA), não para todo botão: se tudo atrai, nada atrai.
 *
 * <p>Escreve na propriedade CSS {@code translate}, não em {@code transform}: o
 * {@code .btn} já usa transform no {@code :active} (o scale de 0.97 do toque),
 * e as duas propriedades se compõem em vez de uma apagar a outra.
 *
 * <p>Só com mouse; nada no toque nem com {@code prefers-reduced-motion}.
 */
@Directive({
  selector: '[appMagnetico]',
  standalone: true,
})
export class MagneticoDirective implements OnDestroy {

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zona = inject(NgZone);
  private desligar?: () => void;

  constructor() {
    afterNextRender(() => {
      if (!matchMedia('(hover: hover) and (pointer: fine)').matches
        || matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    const pos = { x: 0, y: 0 };
    const aplicar = () => {
      alvo.style.translate = `${pos.x.toFixed(2)}px ${pos.y.toFixed(2)}px`;
    };
    const irX = gsap.quickTo(pos, 'x', { duration: 0.35, ease: 'power3.out', onUpdate: aplicar });
    const irY = gsap.quickTo(pos, 'y', { duration: 0.35, ease: 'power3.out', onUpdate: aplicar });

    const aoMover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const caixa = alvo.getBoundingClientRect();
      // O deslocamento é medido do lugar original, não da posição já puxada:
      // descontar o translate atual evita que o botão "persiga" o próprio rastro.
      const cx = caixa.left - pos.x + caixa.width / 2;
      const cy = caixa.top - pos.y + caixa.height / 2;
      irX(gsap.utils.clamp(-MAXIMO.x, MAXIMO.x, (e.clientX - cx) * 0.3));
      irY(gsap.utils.clamp(-MAXIMO.y, MAXIMO.y, (e.clientY - cy) * 0.4));
    };
    const aoSair = () => {
      irX(0);
      irY(0);
    };

    alvo.addEventListener('pointermove', aoMover);
    alvo.addEventListener('pointerleave', aoSair);
    this.desligar = () => {
      alvo.removeEventListener('pointermove', aoMover);
      alvo.removeEventListener('pointerleave', aoSair);
      gsap.killTweensOf(pos);
      alvo.style.translate = '';
    };
  }
}
