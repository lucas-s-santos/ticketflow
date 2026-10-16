import { Directive, ElementRef, NgZone, OnDestroy, effect, inject, input } from '@angular/core';
import { gsap } from 'gsap';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * Escreve um número no elemento, contando de zero até ele na primeira vez.
 *
 * <p>Só a primeira exibição anima: num painel de uso diário, número que roda de
 * novo a cada atualização atrapalha a leitura — e é justamente quando a pessoa
 * quer comparar com o que via antes. Depois disso, a troca é direta.
 *
 * <p>O elemento deve ficar vazio no template: a diretiva é dona do texto dele.
 * Funciona com a classe {@code .numero} (tabular-nums), que impede os dígitos de
 * "dançarem" enquanto contam.
 */
@Directive({
  selector: '[appContagem]',
  standalone: true,
})
export class ContagemDirective implements OnDestroy {

  readonly valor = input.required<number>({ alias: 'appContagem' });
  readonly formato = input<'inteiro' | 'moeda'>('inteiro');

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);
  private animacao?: gsap.core.Tween;
  private primeira = true;

  constructor() {
    effect(() => this.escrever(this.valor()));
  }

  ngOnDestroy(): void {
    this.animacao?.kill();
  }

  private escrever(alvo: number): void {
    const el = this.elemento.nativeElement as HTMLElement;
    const formatar = (v: number) => (this.formato() === 'moeda' ? MOEDA.format(v) : INTEIRO.format(v));
    const reduzido = typeof window === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.animacao?.kill();
    if (!this.primeira || reduzido) {
      el.textContent = formatar(alvo);
      return;
    }
    this.primeira = false;

    const contador = { v: 0 };
    el.textContent = formatar(0);
    this.zona.runOutsideAngular(() => {
      this.animacao = gsap.to(contador, {
        v: alvo,
        duration: 1.2,
        ease: 'power3.out',
        onUpdate: () => { el.textContent = formatar(this.formato() === 'moeda' ? contador.v : Math.round(contador.v)); },
      });
    });
  }
}
