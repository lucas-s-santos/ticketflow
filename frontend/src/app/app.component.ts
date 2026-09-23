import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

// Casca da aplicacao: navbar, area de rota e rodape.
// O <router-outlet> e onde o Angular injeta o componente da rota atual.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-papel-100">
      <app-navbar />

      <main class="flex-1">
        <router-outlet />
      </main>

      <footer class="border-t border-papel-300 bg-papel-200/50 mt-auto">
        <div class="max-w-6xl mx-auto px-6 py-12">
          <div class="flex flex-wrap items-start justify-between gap-8">
            <div class="max-w-xs">
              <p class="font-display text-titulo-sm font-semibold text-tinta-900 mb-2">Canhoto</p>
              <p class="text-sm leading-relaxed text-tinta-500">
                Uma parte fica na portaria. A outra fica com você.
              </p>
            </div>

            <nav class="flex flex-col gap-2.5 text-sm">
              <p class="etiqueta text-tinta-400 mb-1">Navegar</p>
              <a routerLink="/events" class="text-tinta-700 hover:text-acento-texto transition-colors">Eventos</a>
              <a routerLink="/reservations" class="text-tinta-700 hover:text-acento-texto transition-colors">Meus ingressos</a>
              <a routerLink="/login" class="text-tinta-700 hover:text-acento-texto transition-colors">Entrar</a>
            </nav>

            <div class="max-w-xs">
              <p class="etiqueta text-tinta-400 mb-3">Sobre o projeto</p>
              <p class="text-sm leading-relaxed text-tinta-500">
                Projeto de portfólio construído com Java 21, Spring Boot, PostgreSQL,
                RabbitMQ e Angular. O gateway de pagamento é simulado.
              </p>
            </div>
          </div>

          <div class="regua my-8"></div>

          <p class="etiqueta text-tinta-400">
            Canhoto · Demonstração técnica · Nenhum ingresso real é vendido aqui
          </p>
        </div>
      </footer>
    </div>
  `,
})
export class AppComponent {}
