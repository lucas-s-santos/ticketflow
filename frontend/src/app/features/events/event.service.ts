import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { EventResponse, EventRequest } from './event.model';

// Injectable({ providedIn: 'root' }): o Angular cria uma única instância deste serviço
// e a disponibiliza em qualquer componente do app sem precisar declará-lo em providers[].
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly api = inject(ApiService);

  // Observable<T>: representa um fluxo de dados assíncrono.
  // Pense como uma Promise, mas mais poderoso: pode emitir múltiplos valores ao longo do tempo.
  // O componente "se inscreve" com .subscribe() para receber o resultado quando chegar.
  getEvents(): Observable<EventResponse[]> {
    return this.api.get<EventResponse[]>('/events');
  }

  getEventById(id: string): Observable<EventResponse> {
    return this.api.get<EventResponse>(`/events/${id}`);
  }

  createEvent(body: EventRequest): Observable<EventResponse> {
    return this.api.post<EventResponse>('/events', body);
  }

  deleteEvent(id: string): Observable<void> {
    return this.api.delete<void>(`/events/${id}`);
  }
}
