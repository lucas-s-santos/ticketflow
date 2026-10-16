import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContagemDirective } from '../../../shared/directives/contagem.directive';
import { DemonstrarDirective } from '../../../shared/directives/demonstrar.directive';
import { InclinarDirective } from '../../../shared/directives/inclinar.directive';

type Demo = 'assentos' | 'cobranca' | 'fila' | 'portaria';

interface Garantia {
  readonly demo: Demo;
  readonly rotulo: string;
  readonly titulo: string;
  readonly texto: string;
  /** Só onde existe teste de verdade no backend — o da portaria ainda não tem. */
  readonly testado: boolean;
}

/** Padrão do QR da demonstração: decorativo, não decodifica (7x7, com os três "olhos"). */
const QR = [
  '1110101', '1010011', '1110110', '0001010', '1101011', '0110101', '1011101',
].flatMap((linha) => [...linha].map((c) => c === '1'));

/**
 * "Por dentro do Canhoto": o que o sistema garante por trás do clique, cada
 * garantia com uma demonstração curta que roda quando aparece e de novo ao
 * passar o mouse.
 *
 * <p>Fica depois de "Por que Canhoto?" de propósito: o ingresso 3D viaja entre
 * as âncoras das seções acima, e uma seção no meio do caminho seria
 * atravessada por ele. Depois da última parada ele sobe junto com a página.
 *
 * <p>As demonstrações são keyframes de CSS (.demo-* em styles.css) presos à
 * classe .em-cena, que a DemonstrarDirective liga. Sem script, cada uma mostra o
 * estado final, parado.
 */
@Component({
  selector: 'app-por-dentro',
  standalone: true,
  imports: [ContagemDirective, DemonstrarDirective, InclinarDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="por-dentro" class="fundo-por-dentro relative isolate overflow-hidden text-papel-50">
      <div class="max-w-6xl mx-auto px-6 py-20 md:py-28">

        <p class="etiqueta text-acento-500 mb-4">Por dentro</p>
        <h2 appDemonstrar class="text-titulo-lg font-semibold max-w-3xl mb-6">
          O que acontece <span class="marca-viva">por trás do clique</span>
        </h2>
        <p class="text-lg leading-relaxed text-papel-300 max-w-2xl">
          Comprar um ingresso parece um gesto só. Por baixo, o sistema segura quatro
          garantias — e a maioria delas é conferida por teste automatizado a cada
          mudança no código.
        </p>

        <dl class="grid grid-cols-3 gap-4 sm:gap-8 max-w-3xl mt-12 mb-14 py-7 border-y border-papel-50/10">
          @for (n of numeros; track n.rotulo) {
            <div class="flex flex-col gap-2">
              <dt class="etiqueta text-papel-400 leading-snug">{{ n.rotulo }}</dt>
              <dd class="order-first numero text-3xl sm:text-5xl font-bold text-papel-50">
                <span [appContagem]="n.valor" [quandoVisivel]="true"></span><span class="text-acento-500 text-xl sm:text-2xl ml-1">{{ n.unidade }}</span>
              </dd>
            </div>
          }
        </dl>

        <div class="grid md:grid-cols-2 gap-5">
          @for (g of garantias; track g.demo; let i = $index) {
            <article appDemonstrar appInclinar [inclinacao]="0" brilho="acento" class="garantia">
              <div class="garantia-palco" aria-hidden="true">
                @switch (g.demo) {
                  @case ('assentos') {
                    <div class="demo-assentos">
                      @for (a of vinte; track a) {
                        <span class="assento" [class.assento-vendido]="a < 5" [style.--i]="a"></span>
                      }
                    </div>
                    <p class="demo-legenda numero"><span class="text-acento-500">5 reservas</span> · 15 recusadas · 0 a mais</p>
                  }
                  @case ('cobranca') {
                    <div class="demo-cobranca">
                      <p class="pedido pedido-1 numero">POST /payments <span class="chave">chave 7f3a…</span></p>
                      <p class="pedido pedido-2 numero"><span class="pedido-texto">POST /payments <span class="chave">chave 7f3a…</span></span><span class="mesma-chave">mesma chave</span></p>
                      <p class="recibo numero">1 cobrança · R$ 180,00</p>
                    </div>
                  }
                  @case ('fila') {
                    <div class="demo-fila">
                      <span class="fila-trilho"><span class="fila-tinta"></span></span>
                      <ol class="fila-etapas">
                        @for (e of etapas; track e; let j = $index) {
                          <li class="fila-etapa" [style.--j]="j"><span class="fila-ponto"></span><span class="numero">{{ e }}</span></li>
                        }
                      </ol>
                      <p class="demo-legenda numero fila-legenda">resposta na hora · confirmação <span class="text-acento-500">assinada</span></p>
                    </div>
                  }
                  @case ('portaria') {
                    <div class="demo-portaria">
                      <div class="demo-qr">
                        @for (q of qr; track $index) {
                          <span [class.cheio]="q"></span>
                        }
                        <span class="varredura"></span>
                      </div>
                      <div class="leituras">
                        <p class="leitura leitura-1"><span class="selo-confirmado">Válido</span><span class="numero">1ª leitura · 20:41</span></p>
                        <p class="leitura leitura-2"><span class="carimbo-demo">Já utilizado</span><span class="numero">2ª leitura · 20:43</span></p>
                      </div>
                    </div>
                  }
                }
              </div>

              <div class="px-7 pt-6 pb-7">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <p class="etiqueta text-acento-500">0{{ i + 1 }} · {{ g.rotulo }}</p>
                  @if (g.testado) {
                    <span class="etiqueta text-papel-400 border border-papel-50/15 px-2 py-1">Testado</span>
                  }
                </div>
                <h3 class="text-titulo-sm font-semibold text-papel-50 mb-2">{{ g.titulo }}</h3>
                <p class="text-sm leading-relaxed text-papel-300">{{ g.texto }}</p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class PorDentroComponent {

  readonly numeros = [
    { valor: 15, unidade: 'min', rotulo: 'de vaga guardada enquanto você paga' },
    { valor: 256, unidade: 'bits', rotulo: 'na assinatura de cada ingresso' },
    { valor: 1, unidade: 'uso', rotulo: 'por ingresso na portaria' },
  ];

  readonly garantias: readonly Garantia[] = [
    {
      demo: 'assentos',
      rotulo: 'Sem sobrevenda',
      titulo: 'Vinte pessoas, cinco vagas, o mesmo segundo',
      texto: 'O banco trava a vaga no instante da reserva. Um teste dispara 20 pedidos simultâneos por 5 vagas a cada mudança no código — e saem sempre exatamente 5 ingressos.',
      testado: true,
    },
    {
      demo: 'cobranca',
      rotulo: 'Cobrança única',
      titulo: 'Clicou duas vezes? Paga uma',
      texto: 'Cada pagamento leva uma chave única. Clique duplo ou internet instável reenviam o pedido, e o sistema devolve o mesmo pagamento em vez de cobrar de novo.',
      testado: true,
    },
    {
      demo: 'fila',
      rotulo: 'Segundo plano',
      titulo: 'A tela não espera o banco',
      texto: 'O checkout responde na hora e o pagamento corre numa fila. O resultado volta por um webhook assinado; se a entrega falhar, ela é refeita sozinha.',
      testado: true,
    },
    {
      demo: 'portaria',
      rotulo: 'Uso único',
      titulo: 'O segundo uso é recusado',
      texto: 'Na portaria o código é conferido e marcado como usado. Print, foto ou cópia do mesmo ingresso não passam de novo.',
      testado: false,
    },
  ];

  readonly vinte = Array.from({ length: 20 }, (_, i) => i);
  readonly etapas = ['Checkout', 'Fila', 'Gateway', 'Webhook'];
  readonly qr = QR;
}
