import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { organizerGuard } from '../../core/guards/organizer.guard';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./events-list/events-list.component').then((m) => m.EventsListComponent),
  },
  {
    path: 'new',
    canActivate: [authGuard, organizerGuard],
    loadComponent: () =>
      import('./event-form/event-form.component').then((m) => m.EventFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./event-detail/event-detail.component').then((m) => m.EventDetailComponent),
  },
  {
    path: ':id/edit',
    canActivate: [authGuard, organizerGuard],
    loadComponent: () =>
      import('./event-form/event-form.component').then((m) => m.EventFormComponent),
  },
];
