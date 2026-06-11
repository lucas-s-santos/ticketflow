import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

// AppComponent é o "shell" da aplicação: renderiza a navbar e o <router-outlet>.
// O <router-outlet> é onde o Angular injeta o componente da rota atual.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar />
    <main class="min-h-screen bg-gray-50">
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
