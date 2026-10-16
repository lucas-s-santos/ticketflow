import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { organizerGuard } from './core/guards/organizer.guard';

// Guardas importadas direto, nunca por import() dinâmico: canActivate com
// () => import(...).then(m => m.guarda) devolve a FUNÇÃO da guarda sem
// executá-la, e o router trata qualquer valor que não seja false nem
// UrlTree como "pode entrar". Foi assim que estas rotas ficaram abertas.

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
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'reservations',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservations/my-reservations/my-reservations.component')
        .then((m) => m.MyReservationsComponent),
  },
  {
    path: 'organizer',
    canActivate: [authGuard, organizerGuard],
    loadComponent: () =>
      import('./features/organizer/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'organizer/validate',
    canActivate: [authGuard, organizerGuard],
    loadComponent: () =>
      import('./features/organizer/validate/validate-ticket.component').then((m) => m.ValidateTicketComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
