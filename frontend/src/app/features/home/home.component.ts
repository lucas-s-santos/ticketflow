import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- ================= ABERTURA ================= -->
    <section class="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
      <div class="grid lg:grid-cols-[1.15fr_1fr] gap-14 lg:gap-16 items-center">

        <div class="animate-entrar-baixo">
          <p class="etiqueta text-acento-texto mb-5">Ingressos sem sobrevenda</p>

          <h1 class="text-titulo-xl font-semibold text-tinta-900 mb-6">
            O lugar é seu<br />
            no instante do clique.
          </h1>

          <p class="text-lg leading-relaxed text-tinta-600 max-w-lg mb-9">
            A vaga sai do estoque assim que você reserva e fica guardada por quinze
            minutos enquanto você paga. Acabou aquela história de perder o ingresso
            no meio do checkout.
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <a routerLink="/events" class="btn-principal">Ver eventos em cartaz</a>
            <a href="#como-funciona" class="btn-contorno">Como funciona</a>
          </div>
        </div>

        <!-- Ingresso decorativo: apresenta a linguagem visual do sistema logo de cara -->
        <div class="hidden lg:block" aria-hidden="true">
          <div class="bilhete rotate-[-2.5deg] shadow-papel-alta max-w-sm ml-auto"
               style="--recorte-y: 172px">
            <div class="p-7">
              <p class="etiqueta text-tinta-400 mb-4">Quinta · 21h00 · Tiradentes, MG</p>
              <p class="font-display text-titulo-md font-semibold text-tinta-900 leading-tight mb-2">
                Noite de Jazz<br />na Serra
              </p>
              <p class="text-sm text-tinta-500 mb-7">Casa de Cultura · Plateia</p>
              <p class="numero text-[2.5rem] leading-none font-bold text-acento-texto">R$ 95,00</p>
            </div>

            <div class="perfuracao"></div>

            <div class="px-7 py-5 flex items-end justify-between gap-4">
              <div>
                <p class="etiqueta text-tinta-400 mb-1.5">Canhoto</p>
                <p class="numero text-xs text-tinta-600">CNH·4F2A·9K71</p>
              </div>
              <!-- Malha que sugere um QR code, sem fingir ser um codigo real -->
              <svg viewBox="0 0 36 36" class="w-14 h-14 text-tinta-900">
                <path fill="currentColor" d="M0 0h13v13H0zM3 3v7h7V3zM23 0h13v13H23zM26 3v7h7V3zM0 23h13v13H0zM3 26v7h7v-7z"/>
                <path fill="currentColor" d="M16 0h4v4h-4zM16 6h4v4h-4zM16 16h4v4h-4zM23 16h4v4h-4zM30 16h6v4h-6zM16 23h4v4h-4zM23 23h4v4h-4zM30 23h6v4h-6zM16 30h4v6h-4zM23 30h13v3H23z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= COMO FUNCIONA ================= -->
    <section id="como-funciona" class="border-y border-papel-300 bg-papel-200/60">
      <div class="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <h2 class="text-titulo-md font-semibold text-tinta-900 mb-12">Como funciona</h2>

        <ol class="grid md:grid-cols-3 gap-10 md:gap-8">
          @for (passo of passos; track passo.numero) {
            <li>
              <p class="numero text-titulo-md font-bold text-acento-texto/30 leading-none mb-4">
                {{ passo.numero }}
              </p>
              <h3 class="text-titulo-sm font-semibold text-tinta-900 mb-2.5">{{ passo.titulo }}</h3>
              <p class="text-sm leading-relaxed text-tinta-600">{{ passo.texto }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <!-- ================= FECHAMENTO ================= -->
    <section class="max-w-6xl mx-auto px-6 py-16 md:py-24">
      <div class="max-w-2xl">
        <h2 class="text-titulo-lg font-semibold text-tinta-900 mb-5">
          Por que “Canhoto”?
        </h2>
        <p class="text-lg leading-relaxed text-tinta-600 mb-4">
          Todo ingresso de papel tem duas partes. Uma fica na portaria, presa num
          gancho atrás do balcão. A outra — o canhoto — fica com você, no bolso da
          calça, e vira prova de que você esteve lá.
        </p>
        <p class="text-lg leading-relaxed text-tinta-600 mb-8">
          Aqui o canhoto é digital e assinado: só vale uma vez, e ninguém consegue
          forjar outro igual.
        </p>
        <a routerLink="/events" class="btn-tinta">Começar pelos eventos</a>
      </div>
    </section>
  `,
})
export class HomeComponent {
  readonly passos = [
    {
      numero: '01',
      titulo: 'Escolha o setor',
      texto: 'Pista, camarote ou mesa. O preço e quantas vagas ainda restam ficam à vista, atualizados a cada reserva.',
    },
    {
      numero: '02',
      titulo: 'Reserve e pague',
      texto: 'A vaga trava no seu nome por quinze minutos. Pix ou cartão — o pagamento roda em segundo plano e avisa quando cai.',
    },
    {
      numero: '03',
      titulo: 'Entre com o canhoto',
      texto: 'O QR code fica no seu celular. Na portaria é um bipe e pronto. Ele funciona uma única vez, e a segunda tentativa é recusada.',
    },
  ];
}
