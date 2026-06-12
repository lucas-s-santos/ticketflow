export type PaymentMethod = 'PIX' | 'CREDIT_CARD';
export type PaymentStatus = 'PROCESSING' | 'APPROVED' | 'DECLINED';

export interface PaymentRequest {
  reservationId: string;
  method: PaymentMethod;
}

export interface PaymentResponse {
  id: string;
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}
