export interface TicketSectorResponse {
  id: string;
  name: string;
  capacity: number;
  availableSeats: number;
  price: number;
}

export interface TicketSectorRequest {
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
  createdAt: string;
  sectors: TicketSectorResponse[];
}

export interface EventRequest {
  name: string;
  description?: string;
  date: string;
  location: string;
  sectors: TicketSectorRequest[];
}
