import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PaymentRequest, PaymentResponse } from './payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(ApiService);

  // A Idempotency-Key vai como header. Mesma chave reenviada = mesmo pagamento, sem cobrar de novo.
  checkout(body: PaymentRequest, idempotencyKey: string): Observable<PaymentResponse> {
    return this.api.post<PaymentResponse>('/payments', body, { 'Idempotency-Key': idempotencyKey });
  }

  getPayment(id: string): Observable<PaymentResponse> {
    return this.api.get<PaymentResponse>(`/payments/${id}`);
  }
}
