import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/auth.service';

// Barra editorial: papel com uma regua fina embaixo, em vez do bloco de cor
// solido que toda interface de framework usa. A marca fica em serifada.
// Abaixo de md os links colapsam em sanfona.
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 bg-papel-100/95 backdrop-blur-sm border-b border-papel-300">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

        <a routerLink="/" (click)="fechar()" class="flex items-center gap-2.5 group shrink-0">
          <!-- Reducao da logo: ingresso preto com a borda destacada em serrilha
               e o QR em verde. A serrilha e feita com arcos alternando o sentido
               (sweep 1 / sweep 0), que desenham a onda do papel rasgado. -->
          <svg viewBox="0 0 32 29" class="w-8 h-7" aria-hidden="true">
            <path class="fill-tinta-900" d="M7 8 H24
                     a1.62 1.62 0 0 1 0 3.25
                     a1.62 1.62 0 0 0 0 3.25
                     a1.62 1.62 0 0 1 0 3.25
                     a1.62 1.62 0 0 0 0 3.25
                     H7 a2 2 0 0 1 -2-2 V10 a2 2 0 0 1 2-2 Z" />
            <g class="fill-acento-500">
              <rect x="8.2" y="10.6" width="3.6" height="3.6" />
              <rect x="15.4" y="10.6" width="3.6" height="3.6" />
              <rect x="8.2" y="15.4" width="3.6" height="3.6" />
            </g>
            <g class="fill-tinta-900">
              <rect x="9.3" y="11.7" width="1.4" height="1.4" />
              <rect x="16.5" y="11.7" width="1.4" height="1.4" />
              <rect x="9.3" y="16.5" width="1.4" height="1.4" />
            </g>
            <g class="fill-papel-50">
              <rect x="13.2" y="15.4" width="1.5" height="1.5" />
              <rect x="15.4" y="17.5" width="1.5" height="1.5" />
              <rect x="17.6" y="15.4" width="1.5" height="1.5" />
            </g>
          </svg>
          <span class="font-display text-[1.375rem] font-semibold tracking-tight text-tinta-900
                       group-hover:text-acento-texto transition-colors">
            Canhoto
          </span>
        </a>

        <!-- Navegacao em linha: md para cima -->
        <nav class="hidden md:flex items-center gap-7 text-sm">
          <a routerLink="/events" routerLinkActive="text-acento-texto"
             class="font-medium text-tinta-700 hover:text-acento-texto transition-colors">
            Eventos
          </a>

          @if (auth.isLoggedIn()) {
            @if (auth.isOrganizador()) {
              <a routerLink="/organizer" routerLinkActive="text-acento-texto"
                 class="font-medium text-tinta-700 hover:text-acento-texto transition-colors">
                Painel
              </a>
              <a routerLink="/organizer/validate" routerLinkActive="text-acento-texto"
                 class="font-medium text-tinta-700 hover:text-acento-texto transition-colors">
                Portaria
              </a>
            }
            <a routerLink="/reservations" routerLinkActive="text-acento-texto"
               class="font-medium text-tinta-700 hover:text-acento-texto transition-colors">
              Meus ingressos
            </a>

            <span class="regua w-px h-5 bg-papel-300" aria-hidden="true"></span>

            <div class="flex items-center gap-3">
              <span class="etiqueta text-tinta-400 hidden lg:inline" [title]="auth.currentUser()?.email ?? ''">
                {{ primeiroNome() }}
              </span>
              <button type="button" (click)="auth.logout()" class="btn-fantasma btn-pequeno">
                Sair
              </button>
            </div>
          } @else {
            <a routerLink="/login" class="btn-tinta btn-pequeno">Entrar</a>
          }
        </nav>

        <!-- Sanfona: abaixo de md -->
        <button
          type="button"
          (click)="alternar()"
          class="md:hidden -mr-2 p-2 text-tinta-700 hover:text-acento-texto transition-colors"
          [attr.aria-expanded]="aberto()"
          aria-controls="menu-mobile"
          aria-label="Abrir menu de navegação"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
            @if (aberto()) {
              <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
            } @else {
              <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
            }
          </svg>
        </button>
      </div>

      @if (aberto()) {
        <nav id="menu-mobile" class="md:hidden border-t border-papel-300 bg-papel-50 px-6 py-2">
          <a routerLink="/events" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
            Eventos
          </a>

          @if (auth.isLoggedIn()) {
            @if (auth.isOrganizador()) {
              <a routerLink="/organizer" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
                Painel do organizador
              </a>
              <a routerLink="/organizer/validate" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
                Portaria — validar ingresso
              </a>
              <a routerLink="/events/new" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
                Criar evento
              </a>
            }
            <a routerLink="/reservations" (click)="fechar()" class="block py-3 text-sm font-medium text-tinta-800 border-b border-papel-200">
              Meus ingressos
            </a>
            <div class="py-4 flex items-center justify-between gap-3">
              <span class="etiqueta text-tinta-400 truncate">{{ auth.currentUser()?.email }}</span>
              <button type="button" (click)="fechar(); auth.logout()" class="btn-contorno btn-pequeno shrink-0">
                Sair
              </button>
            </div>
          } @else {
            <a routerLink="/login" (click)="fechar()" class="btn-tinta w-full my-4">Entrar</a>
          }
        </nav>
      }
    </header>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly aberto = signal(false);

  primeiroNome(): string {
    return this.auth.currentUser()?.name?.split(' ')[0] ?? '';
  }

  alternar(): void {
    this.aberto.update((v) => !v);
  }

  fechar(): void {
    this.aberto.set(false);
  }
}
