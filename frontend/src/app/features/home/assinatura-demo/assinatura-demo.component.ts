import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

/**
 * Chave só desta demonstração, à vista no código de propósito. A chave real dos
 * ingressos fica no backend (app.ticket.secret) e nunca chega ao navegador.
 */
const CHAVE_DEMO = 'canhoto-demonstracao';

/** Reserva de exemplo. O id é o trecho que a pessoa pode adulterar. */
const RESERVA = '7f3c21aa';
const RESTO_DO_CONTEUDO = ' · setor pista · 1 entrada';
const HEX = '0123456789abcdef';

type Estado = 'conferindo' | 'valido' | 'invalido';

/**
 * Demonstração da seção "O canhoto": a assinatura é recalculada a partir do
 * conteúdo do ingresso, como a portaria faz, e trocar um único caractere a muda
 * por inteiro.
 *
 * <p>O HMAC é de verdade (Web Crypto, SHA-256), não uma animação fingindo um.
 * O embaralhar do GSAP só cobre o instante em que o valor novo aparece.
 */
@Component({
  selector: 'app-assinatura-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="bg-papel-50 border border-papel-300 rounded-bilhete">
      <div class="px-5 pt-4 pb-3.5">
        <p class="campo-rotulo">Conteúdo do ingresso</p>
        <p class="numero text-sm text-tinta-900 break-all">
          <!-- Letra por letra para destacar a trocada; o leitor de tela ouve o id inteiro. -->
          reserva <span class="sr-only">{{ reserva() }}</span><span aria-hidden="true">@for (letra of letras(); track $index) {<span
            [class]="$index === posicaoTrocada() ? 'bg-erro-100 text-erro-600 outline outline-1 outline-erro-500/40' : ''"
          >{{ letra }}</span>}</span>{{ resto }}
        </p>
      </div>

      <div class="perfuracao"></div>

      <dl class="px-5 pt-3.5 grid gap-2.5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <dt class="campo-rotulo mb-0">Assinatura no ingresso</dt>
          <dd class="numero text-sm text-tinta-900">{{ assinaturaOriginal() }}</dd>
        </div>
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <dt class="campo-rotulo mb-0">Recalculada na portaria</dt>
          <!-- Texto escrito pelo GSAP, não pelo Angular: os dois disputariam o mesmo nó. -->
          <dd #recalculada class="numero text-sm transition-colors duration-200"
              [class.text-tinta-900]="estado() !== 'invalido'"
              [class.text-erro-600]="estado() === 'invalido'">{{ VAZIO }}</dd>
        </div>
      </dl>

      <div class="px-5 pt-4 pb-5 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite">
          @switch (estado()) {
            @case ('valido') { <span class="selo-confirmado">Válido</span> }
            @case ('invalido') { <span class="selo-recusado">Assinatura não confere</span> }
            @default { <span class="selo-neutro">Conferindo…</span> }
          }
        </p>
        <button type="button" class="btn-contorno btn-pequeno" (click)="alternar()"
                [disabled]="estado() === 'conferindo'">
          {{ posicaoTrocada() === null ? 'Trocar um caractere' : 'Desfazer a troca' }}
        </button>
      </div>
    </figure>
  `,
})
export class AssinaturaDemoComponent implements OnDestroy {

  readonly VAZIO = '···· ···· ···· ····';
  readonly resto = RESTO_DO_CONTEUDO;

  readonly reserva = signal(RESERVA);
  readonly posicaoTrocada = signal<number | null>(null);
  readonly assinaturaOriginal = signal(this.VAZIO);
  readonly estado = signal<Estado>('conferindo');
  readonly letras = computed(() => this.reserva().split(''));

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly zona = inject(NgZone);
  private readonly recalculada = viewChild.required<ElementRef<HTMLElement>>('recalculada');

  private readonly reduzido = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private observador?: IntersectionObserver;
  private destruido = false;

  constructor() {
    // A primeira conferência acontece quando o cartão aparece na tela — é ela
    // que mostra, logo de cara, que a assinatura bate.
    afterNextRender(() => {
      this.zona.runOutsideAngular(() => {
        this.observador = new IntersectionObserver(([registro]) => {
          if (!registro.isIntersecting) return;
          this.observador?.disconnect();
          void this.conferirPrimeiraVez();
        }, { threshold: 0.4 });
        this.observador.observe(this.elemento.nativeElement);
      });
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.observador?.disconnect();
    gsap.killTweensOf(this.recalculada().nativeElement);
  }

  alternar(): void {
    const trocada = this.posicaoTrocada();
    if (trocada === null) {
      // Troca um caractere qualquer do id por outro dígito hexadecimal.
      const posicao = Math.floor(Math.random() * RESERVA.length);
      const original = RESERVA[posicao];
      const opcoes = HEX.replace(original, '');
      const novo = opcoes[Math.floor(Math.random() * opcoes.length)];
      this.reserva.set(RESERVA.slice(0, posicao) + novo + RESERVA.slice(posicao + 1));
      this.posicaoTrocada.set(posicao);
    } else {
      this.reserva.set(RESERVA);
      this.posicaoTrocada.set(null);
    }
    void this.recalcular();
  }

  private async conferirPrimeiraVez(): Promise<void> {
    const assinatura = await assinar(RESERVA + RESTO_DO_CONTEUDO);
    if (this.destruido) return;
    this.zona.run(() => this.assinaturaOriginal.set(assinatura));
    await this.mostrar(assinatura);
    this.concluir(assinatura);
  }

  private async recalcular(): Promise<void> {
    this.estado.set('conferindo');
    const assinatura = await assinar(this.reserva() + RESTO_DO_CONTEUDO);
    if (this.destruido) return;
    await this.mostrar(assinatura);
    this.concluir(assinatura);
  }

  /** Escreve o valor recalculado, embaralhando até ele assentar. */
  private mostrar(assinatura: string): Promise<void> {
    const alvo = this.recalculada().nativeElement;
    if (this.reduzido) {
      alvo.textContent = assinatura;
      return Promise.resolve();
    }
    return new Promise((resolver) => {
      this.zona.runOutsideAngular(() => {
        gsap.to(alvo, {
          duration: 0.9,
          ease: 'none',
          scrambleText: { text: assinatura, chars: HEX, speed: 0.8, revealDelay: 0.25 },
          onComplete: resolver,
        });
      });
    });
  }

  private concluir(assinatura: string): void {
    if (this.destruido) return;
    const valida = assinatura === this.assinaturaOriginal();
    this.zona.run(() => this.estado.set(valida ? 'valido' : 'invalido'));
    // O ingresso 3D da home escuta: adulterada, o selo dele acende em vermelho.
    // Evento de janela em vez de serviço porque a cena vive fora do Angular.
    window.dispatchEvent(new CustomEvent('canhoto:assinatura', { detail: { valida } }));
  }
}

/**
 * HMAC-SHA256 do conteúdo, nos primeiros 8 bytes, em quatro grupos de quatro
 * hexadecimais — o tamanho que cabe numa linha do cartão.
 */
async function assinar(conteudo: string): Promise<string> {
  const bytes = crypto.subtle
    ? new Uint8Array(await hmac(conteudo))
    : semCriptografia(conteudo);
  const hex = Array.from(bytes.slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
  return hex.match(/.{4}/g)!.join(' ');
}

async function hmac(conteudo: string): Promise<ArrayBuffer> {
  const codificar = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    'raw', codificar.encode(CHAVE_DEMO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return crypto.subtle.sign('HMAC', chave, codificar.encode(conteudo));
}

/**
 * crypto.subtle só existe em contexto seguro (https ou localhost). Abrindo o
 * dev server pelo IP da rede, ele some; aí a demonstração cai para um hash
 * simples (FNV-1a) só para continuar funcionando — o comportamento visível é o
 * mesmo: um caractere trocado muda o valor inteiro.
 */
function semCriptografia(conteudo: string): Uint8Array {
  const saida = new Uint8Array(8);
  for (let rodada = 0; rodada < 2; rodada++) {
    let h = 0x811c9dc5 ^ rodada;
    for (let i = 0; i < conteudo.length; i++) {
      h ^= conteudo.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    for (let b = 0; b < 4; b++) saida[rodada * 4 + b] = (h >>> (b * 8)) & 0xff;
  }
  return saida;
}
