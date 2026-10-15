import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { gsap } from 'gsap';

/** Revela quando o topo da moldura passa desta fração da altura da janela. */
const LIMIAR = 0.85;

/**
 * Revela uma imagem por máscara quando ela entra na tela: a moldura abre de
 * baixo para cima enquanto a foto, por dentro, assenta de levemente ampliada
 * para o tamanho certo.
 *
 * <p>Use no elemento que envolve a {@code <img>}, com {@code overflow-hidden}.
 * O recorte é {@code clip-path}, que convive com a máscara do {@code .bilhete}
 * e com o {@code transform} da {@code ParalaxeDirective} no mesmo elemento.
 *
 * <p><b>Por que não IntersectionObserver</b>, como a RevelarDirective: o Chrome
 * aplica o clip-path no cálculo de interseção. Com a moldura totalmente
 * recortada, o observador nunca dispara — e o lazy loading da imagem, que usa o
 * mesmo mecanismo, nunca baixa a foto. Aqui a posição vem de
 * getBoundingClientRect, que o recorte não altera, e a imagem é baixada sem
 * esperar.
 *
 * <p>Um disparo só, estado inicial aplicado por JavaScript (se o script falhar,
 * a imagem simplesmente aparece) e nada com {@code prefers-reduced-motion}.
 */
@Directive({
  selector: '[appRevelarMascara]',
  standalone: true,
})
export class RevelarMascaraDirective implements OnInit, OnDestroy {

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);

  private animacao?: gsap.core.Timeline;
  private agendado = false;
  private ouvindo = false;

  private readonly aoRolar = () => {
    if (this.agendado) return;
    this.agendado = true;
    requestAnimationFrame(() => {
      this.agendado = false;
      this.conferir();
    });
  };

  ngOnInit(): void {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const moldura = this.moldura();
    const imagem = moldura.querySelector('img');
    if (imagem) imagem.loading = 'eager';

    this.zona.runOutsideAngular(() => {
      gsap.set(moldura, { clipPath: 'inset(100% 0% 0% 0%)' });
      if (imagem) gsap.set(imagem, { scale: 1.18 });

      window.addEventListener('scroll', this.aoRolar, { passive: true });
      window.addEventListener('resize', this.aoRolar, { passive: true });
      this.ouvindo = true;
      // Pode já nascer à vista (link direto, recarga no meio da página).
      this.aoRolar();
    });
  }

  ngOnDestroy(): void {
    this.pararDeOuvir();
    this.animacao?.kill();
  }

  private conferir(): void {
    if (!this.ouvindo) return;
    const caixa = this.moldura().getBoundingClientRect();
    if (caixa.top > window.innerHeight * LIMIAR || caixa.bottom < 0) return;

    this.pararDeOuvir();
    const moldura = this.moldura();
    const imagem = moldura.querySelector('img');

    // inOut na moldura: é movimento atravessando a tela, não entrada de UI.
    // A foto usa out e dura mais, então ainda assenta depois de a moldura
    // abrir — é esse atraso que dá a sensação de profundidade.
    this.animacao = gsap.timeline()
      .to(moldura, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut' }, 0)
      .add(() => { gsap.set(moldura, { clearProps: 'clipPath' }); });
    if (imagem) {
      this.animacao.to(imagem, { scale: 1, duration: 1.5, ease: 'power3.out' }, 0);
    }
  }

  private pararDeOuvir(): void {
    if (!this.ouvindo) return;
    this.ouvindo = false;
    window.removeEventListener('scroll', this.aoRolar);
    window.removeEventListener('resize', this.aoRolar);
  }

  private moldura(): HTMLElement {
    return this.elemento.nativeElement as HTMLElement;
  }
}
