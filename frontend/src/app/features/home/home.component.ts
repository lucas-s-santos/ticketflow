import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="max-w-4xl mx-auto px-6 py-20 text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        Encontre os melhores eventos
      </h1>
      <p class="text-lg text-gray-600 mb-8">
        Compre ingressos com segurança e sem complicação.
      </p>
      <a
        routerLink="/events"
        class="inline-block bg-indigo-700 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-indigo-800 transition-colors"
      >
        Ver eventos
      </a>
    </section>
  `,
})
export class HomeComponent {}
