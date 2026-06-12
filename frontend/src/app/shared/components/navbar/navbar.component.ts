import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../features/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bg-indigo-700 text-white px-6 py-4 shadow-md">
      <div class="max-w-6xl mx-auto flex justify-between items-center">
        <a routerLink="/" class="text-xl font-bold tracking-tight hover:text-indigo-200 transition-colors">
          TicketFlow
        </a>
        <div class="flex items-center gap-6 text-sm font-medium">
          <a
            routerLink="/events"
            routerLinkActive="underline underline-offset-4"
            class="hover:text-indigo-200 transition-colors"
          >
            Eventos
          </a>

          @if (authService.isLoggedIn()) {
            @if (authService.isOrganizador()) {
              <a
                routerLink="/organizer"
                routerLinkActive="underline underline-offset-4"
                class="hover:text-indigo-200 transition-colors"
              >
                Painel
              </a>
              <a
                routerLink="/events/new"
                class="hover:text-indigo-200 transition-colors"
              >
                Criar Evento
              </a>
            }
            <a
              routerLink="/reservations"
              routerLinkActive="underline underline-offset-4"
              class="hover:text-indigo-200 transition-colors"
            >
              Minhas Reservas
            </a>
            <span class="text-indigo-300 text-xs hidden sm:inline">
              {{ authService.currentUser()?.email }}
            </span>
            <button
              (click)="authService.logout()"
              class="bg-white text-indigo-700 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
            >
              Sair
            </button>
          } @else {
            <a
              routerLink="/login"
              class="bg-white text-indigo-700 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
            >
              Entrar
            </a>
          }
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
}
