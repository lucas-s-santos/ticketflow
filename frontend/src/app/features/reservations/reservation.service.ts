import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ReservationRequest, ReservationResponse } from './reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly api = inject(ApiService);

  create(body: ReservationRequest): Observable<ReservationResponse> {
    return this.api.post<ReservationResponse>('/reservations', body);
  }

  getMyReservations(): Observable<ReservationResponse[]> {
    return this.api.get<ReservationResponse[]>('/reservations/me');
  }

  cancel(id: string): Observable<void> {
    return this.api.delete<void>(`/reservations/${id}`);
  }
}
