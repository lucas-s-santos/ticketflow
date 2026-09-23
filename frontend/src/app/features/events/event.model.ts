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
