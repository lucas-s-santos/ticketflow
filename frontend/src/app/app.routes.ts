import { Routes } from '@angular/router';

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
    canActivate: [() => import('./core/guards/auth.guard').then(m => m.authGuard)],
    loadComponent: () =>
      import('./features/reservations/my-reservations/my-reservations.component')
        .then((m) => m.MyReservationsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
