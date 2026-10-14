import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { EventResponse, EventRequest, EventFilters, PageResponse } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly api = inject(ApiService);

  /**
   * Listagem paginada com busca e filtros.
   *
   * O backend limita o tamanho a 50 e ordena por data; pedir mais do que isso
   * e silenciosamente reduzido, nao rejeitado. Filtro ausente nao vai na URL:
   * mandar `q=` vazio faria o backend tratar string vazia como termo de busca.
   */
  getEvents(filtros: EventFilters = {}, pagina = 0, tamanho = 12): Observable<PageResponse<EventResponse>> {
    const params = new URLSearchParams();
    params.set('page', String(pagina));
    params.set('size', String(tamanho));

    if (filtros.q?.trim()) {
      params.set('q', filtros.q.trim());
    }
    if (filtros.de) {
      params.set('de', filtros.de);
    }
    if (filtros.ate) {
      params.set('ate', filtros.ate);
    }
    if (filtros.comVagas) {
      params.set('comVagas', 'true');
    }

    return this.api.get<PageResponse<EventResponse>>(`/events?${params.toString()}`);
  }

  getEventById(id: string): Observable<EventResponse> {
    return this.api.get<EventResponse>(`/events/${id}`);
  }

  createEvent(body: EventRequest): Observable<EventResponse> {
    return this.api.post<EventResponse>('/events', body);
  }

  updateEvent(id: string, body: EventRequest): Observable<EventResponse> {
    return this.api.put<EventResponse>(`/events/${id}`, body);
  }

  deleteEvent(id: string): Observable<void> {
    return this.api.delete<void>(`/events/${id}`);
  }
}
