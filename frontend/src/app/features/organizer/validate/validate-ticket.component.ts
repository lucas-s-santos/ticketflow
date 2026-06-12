import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrganizerService } from '../organizer.service';
import { TicketValidationResult } from '../organizer.model';

@Component({
  selector: 'app-validate-ticket',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <div class="max-w-lg mx-auto px-6 py-10">
      <a routerLink="/organizer" class="text-sm text-indigo-600 hover:underline mb-4 inline-block">← Voltar ao painel</a>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Validar Ingresso</h2>
      <p class="text-sm text-gray-500 mb-6">Cole o código do ingresso (conteúdo do QR) para validar e fazer o check-in.</p>

      <div class="flex gap-2 mb-6">
        <input
          type="text"
          [(ngModel)]="token"
          placeholder="Código do ingresso..."
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          (click)="validate()"
          [disabled]="validating() || !token.trim()"
          class="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {{ validating() ? 'Validando...' : 'Validar' }}
        </button>
      </div>

      @if (result(); as r) {
        <div [class]="r.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
          class="border rounded-xl p-5">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">{{ r.valid ? '✅' : '❌' }}</span>
            <span [class]="r.valid ? 'text-green-800' : 'text-red-800'" class="font-semibold">
              {{ reasonLabel(r.reason) }}
            </span>
          </div>
          @if (r.eventName) {
            <div class="text-sm text-gray-700 space-y-0.5 mt-2">
              <p><span class="text-gray-500">Evento:</span> {{ r.eventName }}</p>
              <p><span class="text-gray-500">Setor:</span> {{ r.sectorName }}</p>
              <p><span class="text-gray-500">Titular:</span> {{ r.holderName }}</p>
              <p><span class="text-gray-500">Ingressos:</span> {{ r.quantity }}</p>
              @if (r.checkedInAt) {
                <p><span class="text-gray-500">Check-in:</span> {{ r.checkedInAt | date:'dd/MM/yyyy HH:mm' }}</p>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ValidateTicketComponent {
  private readonly organizerService = inject(OrganizerService);

  token = '';
  validating = signal(false);
  result = signal<TicketValidationResult | null>(null);

  validate(): void {
    if (!this.token.trim()) return;
    this.validating.set(true);
    this.result.set(null);
    this.organizerService.validateTicket(this.token.trim()).subscribe({
      next: (r) => { this.result.set(r); this.validating.set(false); },
      error: () => {
        this.result.set({ valid: false, reason: 'ERROR', eventName: null, sectorName: null, holderName: null, quantity: null, checkedInAt: null });
        this.validating.set(false);
      },
    });
  }

  reasonLabel(reason: string): string {
    const map: Record<string, string> = {
      OK: 'Ingresso válido — check-in realizado!',
      ALREADY_USED: 'Ingresso já utilizado',
      INVALID_SIGNATURE: 'Código inválido ou adulterado',
      NOT_FOUND: 'Ingresso não encontrado',
      NOT_CONFIRMED: 'Reserva não está paga',
      NOT_OWNER: 'Ingresso não é de um evento seu',
      ERROR: 'Erro ao validar',
    };
    return map[reason] ?? reason;
  }
}
