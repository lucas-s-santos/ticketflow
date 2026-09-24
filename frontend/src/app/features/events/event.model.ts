/** Filtros da listagem publica. Campo ausente = filtro nao aplicado. */
export interface EventFilters {
  q?: string;
  /** ISO 8601 com fuso, ex.: 2026-10-01T00:00:00-03:00 */
  de?: string;
  ate?: string;
  comVagas?: boolean;
}

/** Envelope de paginacao da API. Espelha o PageResponseDto do backend. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface TicketSectorResponse {
  id: string;
  name: string;
  capacity: number;
  availableSeats: number;
  price: number;
}

export interface TicketSectorRequest {
  // Presente apenas na edicao: identifica um setor existente para que o backend
  // o atualize em vez de apagar e recriar (apagar quebraria a FK das reservas).
  id?: string;
  name: string;
  capacity: number;
  price: number;
}

export interface EventResponse {
  id: string;
  name: string;
  description: string | null;
  date: string;
  location: string;
  coverImageUrl: string | null;
  createdAt: string;
  sectors: TicketSectorResponse[];
}

export interface EventRequest {
  name: string;
  description?: string;
  date: string;
  location: string;
  coverImageUrl?: string;
  sectors: TicketSectorRequest[];
}
