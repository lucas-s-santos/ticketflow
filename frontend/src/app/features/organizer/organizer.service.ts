import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { OrganizerDashboard, TicketValidationResult } from './organizer.model';

@Injectable({ providedIn: 'root' })
export class OrganizerService {
  private readonly api = inject(ApiService);

  getDashboard(): Observable<OrganizerDashboard> {
    return this.api.get<OrganizerDashboard>('/organizer/dashboard');
  }

  validateTicket(token: string): Observable<TicketValidationResult> {
    return this.api.post<TicketValidationResult>('/tickets/validate', { token });
  }
}
