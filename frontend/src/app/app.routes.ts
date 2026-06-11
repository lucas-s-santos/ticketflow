import { Routes } from '@angular/router';

// loadChildren: lazy loading — o código de cada feature só é baixado quando o usuário navega até ela.
// Isso melhora o tempo de carregamento inicial do app.
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'events',
    loadChildren: () =>
      import('./features/events/events.routes').then((m) => m.EVENTS_ROUTES),
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
