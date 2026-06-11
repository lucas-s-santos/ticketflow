import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// standalone: true — este componente não pertence a nenhum NgModule.
// Ele declara seus próprios imports (RouterLink, RouterLinkActive).
// RouterLink: diretiva que transforma <a> em links do roteador Angular (sem reload da página).
// RouterLinkActive: adiciona a classe CSS quando a rota correspondente está ativa.
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
          <a
            routerLink="/login"
            class="bg-white text-indigo-700 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
          >
            Entrar
          </a>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {}
