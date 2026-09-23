import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrganizerService } from '../organizer.service';
import { TicketValidationResult } from '../organizer.model';

interface Registro {
  reason: string;
  valid: boolean;
  titular: string | null;
  em: Date;
}

@Component({
  selector: 'app-validate-ticket',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <div class="max-w-xl mx-auto px-6 py-12 md:py-16">

      <a routerLink="/organizer" class="etiqueta text-tinta-500 hover:text-acento-texto transition-colors inline-block mb-8">
        ← Voltar ao painel
      </a>

      <p class="etiqueta text-acento-texto mb-3">Portaria</p>
      <h1 class="text-titulo-md font-semibold text-tinta-900 mb-2">Validar ingresso</h1>
      <p class="text-sm text-tinta-500 mb-8">
        Leia o QR do visitante ou cole o código. O campo limpa sozinho para a próxima pessoa.
      </p>

      <div class="flex gap-2 mb-10">
        <input
          #entrada
          type="text"
          [(ngModel)]="codigo"
          (keyup.enter)="validar()"
          placeholder="Código do ingresso"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          class="campo flex-1 font-mono"
        />
        <button type="button" (click)="validar()" [disabled]="validando() || !codigo.trim()"
                class="btn-tinta shrink-0">
          {{ validando() ? 'Lendo…' : 'Validar' }}
        </button>
      </div>

      <!-- ================= RESULTADO ================= -->
      @if (resultado(); as r) {
        <div class="border-l-8 p-7 mb-10 animate-entrar-baixo"
             [class]="r.valid ? 'border-acento-500 bg-acento-100' : 'border-erro-500 bg-erro-100'"
             role="status" aria-live="assertive">

          <p class="etiqueta mb-2" [class]="r.valid ? 'text-acento-texto' : 'text-erro-600'">
            {{ r.valid ? 'Entrada liberada' : 'Entrada recusada' }}
          </p>
          <p class="font-display text-titulo-md font-semibold leading-tight mb-5"
             [class]="r.valid ? 'text-acento-texto' : 'text-erro-600'">
            {{ rotulo(r.reason) }}
          </p>

          @if (r.eventName) {
            <dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
              <dt class="etiqueta text-tinta-400 pt-1">Evento</dt>
              <dd class="font-medium text-tinta-900">{{ r.eventName }}</dd>

              <dt class="etiqueta text-tinta-400 pt-1">Setor</dt>
              <dd class="text-tinta-700">{{ r.sectorName }}</dd>

              <dt class="etiqueta text-tinta-400 pt-1">Titular</dt>
              <dd class="text-tinta-700">{{ r.holderName }}</dd>

              <dt class="etiqueta text-tinta-400 pt-1">Ingressos</dt>
              <dd class="numero text-tinta-900 font-bold">{{ r.quantity }}</dd>

              @if (r.checkedInAt) {
                <dt class="etiqueta text-tinta-400 pt-1">Check-in</dt>
                <dd class="numero text-tinta-700">
                  {{ r.checkedInAt | date:'dd/MM/yyyy · HH:mm':undefined:'pt-BR' }}
                </dd>
              }
            </dl>
          }
        </div>
      }

      <!-- ================= HISTORICO DA SESSAO ================= -->
      @if (historico().length > 0) {
        <section>
          <h2 class="etiqueta text-tinta-400 mb-4">Últimas leituras</h2>
          <ul class="border-t border-papel-300">
            @for (h of historico(); track h.em.getTime()) {
              <li class="flex items-center justify-between gap-4 py-3 border-b border-papel-200">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="w-1.5 h-1.5 rounded-full shrink-0"
                        [class]="h.valid ? 'bg-acento-500' : 'bg-erro-500'" aria-hidden="true"></span>
                  <span class="text-sm text-tinta-700 truncate">
                    {{ h.titular ?? rotulo(h.reason) }}
                  </span>
                </span>
                <span class="numero text-xs text-tinta-400 shrink-0">
                  {{ h.em | date:'HH:mm:ss' }}
                </span>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class ValidateTicketComponent {
  private readonly service = inject(OrganizerService);
  private readonly entrada = viewChild<ElementRef<HTMLInputElement>>('entrada');

  codigo = '';
  readonly validando = signal(false);
  readonly resultado = signal<TicketValidationResult | null>(null);

  // Registro da sessao: numa portaria real, quem opera precisa conferir
  // rapidamente o que acabou de passar sem reler cada ingresso.
  readonly historico = signal<Registro[]>([]);

  validar(): void {
    const token = this.codigo.trim();
    if (!token || this.validando()) {
      return;
    }

    this.validando.set(true);
    this.resultado.set(null);

    this.service.validateTicket(token).subscribe({
      next: (r) => this.concluir(r),
      error: () =>
        this.concluir({
          valid: false,
          reason: 'ERROR',
          eventName: null,
          sectorName: null,
          holderName: null,
          quantity: null,
          checkedInAt: null,
        }),
    });
  }

  rotulo(reason: string): string {
    const mapa: Record<string, string> = {
      OK: 'Pode entrar',
      ALREADY_USED: 'Este ingresso já foi usado',
      INVALID_SIGNATURE: 'Código inválido ou adulterado',
      NOT_FOUND: 'Ingresso não encontrado',
      NOT_CONFIRMED: 'Reserva ainda não foi paga',
      NOT_OWNER: 'Ingresso é de outro organizador',
      ERROR: 'Falha ao consultar o servidor',
    };
    return mapa[reason] ?? reason;
  }

  private concluir(r: TicketValidationResult): void {
    this.resultado.set(r);
    this.validando.set(false);

    this.historico.update((lista) =>
      [{ reason: r.reason, valid: r.valid, titular: r.holderName, em: new Date() }, ...lista].slice(0, 8),
    );

    // Limpa e devolve o foco: numa fila de entrada, cada leitura precisa
    // comecar sem que o operador toque na tela.
    this.codigo = '';
    this.entrada()?.nativeElement.focus();
  }
}
