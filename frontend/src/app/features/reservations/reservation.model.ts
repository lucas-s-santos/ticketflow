export interface ReservationRequest {
  ticketSectorId: string;
  quantity: number;
}

export interface ReservationResponse {
  id: string;
  ticketSectorId: string;
  sectorName: string;
  eventName: string;
  quantity: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  ticketToken?: string | null;   // conteúdo do QR (só quando CONFIRMED)
  checkedInAt?: string | null;   // data do check-in; null = não usado
}
