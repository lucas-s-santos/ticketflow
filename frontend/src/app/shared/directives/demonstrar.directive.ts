import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject } from '@angular/core';

/**
 * Liga a classe {@code .em-cena} quando o elemento aparece na tela, uma vez, e
 * religa a cada vez que o mouse entra nele. As animações em si são keyframes
 * de CSS presos a {@code .em-cena} (styles.css): a diretiva só diz quando.
 *
 * <p>Religar é tirar a classe, forçar um reflow e pôr de novo. Sem o reflow o
 * navegador junta as duas mudanças num quadro só, e a animação não recomeça.
 * Por isso as demonstrações usam keyframes, e não transition: uma transition
 * religada assim voltaria do meio do caminho em vez de começar do zero.
 *
 * <p>No toque não há "entrar com o mouse": roda uma vez, quando aparece. Com
 * {@code prefers-reduced-motion} o estado final aparece direto (o styles.css
 * zera a duração das animações), sem esperar a rolagem.
 */
@Directive({
  selector: '[appDemonstrar]',
  standalone: true,
})
export class DemonstrarDirective implements OnDestroy {

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zona = inject(NgZone);
  private desligar?: () => void;

  constructor() {
    afterNextRender(() => this.zona.runOutsideAngular(() => this.ligar()));
  }

  ngOnDestroy(): void {
    this.desligar?.();
  }

  private ligar(): void {
    const alvo = this.elemento.nativeElement;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      alvo.classList.add('em-cena');
      return;
    }

    const observador = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return;
      alvo.classList.add('em-cena');
      observador.disconnect();
    }, { threshold: 0.4 });
    observador.observe(alvo);

    const religar = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      alvo.classList.remove('em-cena');
      void alvo.offsetWidth;
      alvo.classList.add('em-cena');
    };
    alvo.addEventListener('pointerenter', religar);

    this.desligar = () => {
      observador.disconnect();
      alvo.removeEventListener('pointerenter', religar);
    };
  }
}
