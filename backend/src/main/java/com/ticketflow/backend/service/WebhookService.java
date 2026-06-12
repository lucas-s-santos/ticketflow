package com.ticketflow.backend.service;

import com.ticketflow.backend.dto.PaymentWebhookPayload;
import com.ticketflow.backend.entity.Payment;
import com.ticketflow.backend.entity.PaymentStatus;
import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import com.ticketflow.backend.exception.ResourceNotFoundException;
import com.ticketflow.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Processa o resultado do pagamento recebido via webhook (já com HMAC verificado).
// É aqui que o banco é atualizado — separado da decisão do gateway (PaymentProcessor).
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final PaymentRepository paymentRepository;

    @Transactional
    public void process(PaymentWebhookPayload payload) {
        Payment payment = paymentRepository.findById(payload.paymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento não encontrado: " + payload.paymentId()));

        // Idempotência: webhooks têm entrega at-least-once (podem chegar mais de uma vez).
        // Se já saiu de PROCESSING, ignoramos a reentrega.
        if (payment.getStatus() != PaymentStatus.PROCESSING) {
            log.info("Webhook ignorado: pagamento {} já está {}", payment.getId(), payment.getStatus());
            return;
        }

        if ("APPROVED".equals(payload.decision())) {
            payment.setStatus(PaymentStatus.APPROVED);
            Reservation reservation = payment.getReservation();
            // Assentos já foram decrementados na criação da reserva (Fase 3);
            // confirmar só muda o status, impedindo que o scheduler de expiração a libere.
            reservation.setStatus(ReservationStatus.CONFIRMED);
            log.info("Webhook APPROVED: pagamento {} aprovado, reserva {} confirmada",
                    payment.getId(), reservation.getId());
        } else {
            payment.setStatus(PaymentStatus.DECLINED);
            // Reserva segue PENDING — o usuário pode tentar pagar de novo na janela de 15 min.
            log.info("Webhook DECLINED: pagamento {} recusado", payment.getId());
        }
        paymentRepository.save(payment);
    }
}
