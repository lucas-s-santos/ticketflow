import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Move e gira o elemento conforme ele atravessa a janela.
 *
 * <p>Três cuidados que separam um parallax utilizável de um que trava a página:
 *
 * <p><b>Fora da zona do Angular.</b> Um ouvinte de scroll registrado normalmente
 * dispara detecção de mudanças a cada quadro — com a aplicação inteira sendo
 * verificada 60 vezes por segundo enquanto a pessoa rola. Aqui o listener vive
 * fora da zona e escreve direto no style, sem passar pelo Angular.
 *
 * <p><b>Só calcula o que está à vista.</b> Um IntersectionObserver desliga a
 * conta quando o elemento sai da tela.
 *
 * <p><b>Respeita quem pediu menos movimento.</b> Com
 * {@code prefers-reduced-motion} a diretiva não faz nada — parallax é um gatilho
 * conhecido de enjoo e desconforto vestibular.
 */
@Directive({
  selector: '[appParalaxe]',
  standalone: true,
})
export class ParalaxeDirective implements OnInit, OnDestroy {

  /** Deslocamento vertical total, em px, ao longo da travessia pela janela. */
  readonly deslocamento = input(60);

  /** Giro total, em graus. Zero mantém o elemento reto. */
  readonly giro = input(0);

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);

  private observador?: IntersectionObserver;
  private visivel = false;
  private quadroAgendado = false;

  private readonly aoRolar = () => this.agendar();

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.zona.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(([entrada]) => {
        this.visivel = entrada.isIntersecting;
        if (this.visivel) {
          this.agendar();
        }
      });
      this.observador.observe(this.elemento.nativeElement);

      window.addEventListener('scroll', this.aoRolar, { passive: true });
      window.addEventListener('resize', this.aoRolar, { passive: true });

      this.aplicar();
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    window.removeEventListener('scroll', this.aoRolar);
    window.removeEventListener('resize', this.aoRolar);
  }

  /**
   * Junta vários eventos de scroll num único quadro. Sem isso o navegador
   * recalcularia o layout em cada evento, que chega bem mais rápido que 60Hz.
   */
  private agendar(): void {
    if (this.quadroAgendado || !this.visivel) {
      return;
    }
    this.quadroAgendado = true;
    requestAnimationFrame(() => {
      this.quadroAgendado = false;
      this.aplicar();
    });
  }

  private aplicar(): void {
    const alvo = this.elemento.nativeElement;
    const caixa = alvo.getBoundingClientRect();
    const altura = window.innerHeight;

    // Progresso de +1 (entrando por baixo) a -1 (saindo por cima), 0 no centro.
    const distanciaDoCentro = caixa.top + caixa.height / 2 - altura / 2;
    const percurso = altura / 2 + caixa.height / 2;
    const progresso = Math.max(-1, Math.min(1, distanciaDoCentro / percurso));

    const y = progresso * this.deslocamento();
    const graus = progresso * this.giro();

    // translate3d em vez de translateY: promove a camada para a GPU e evita
    // repintura do conteudo ao redor a cada quadro.
    alvo.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${graus.toFixed(2)}deg)`;
    alvo.style.willChange = 'transform';
  }
}
