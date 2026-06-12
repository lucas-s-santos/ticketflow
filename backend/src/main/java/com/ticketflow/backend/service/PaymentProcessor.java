package com.ticketflow.backend.service;

import com.ticketflow.backend.config.RabbitMQConfig;
import com.ticketflow.backend.dto.PaymentMessage;
import com.ticketflow.backend.entity.Payment;
import com.ticketflow.backend.entity.PaymentStatus;
import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import com.ticketflow.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.ThreadLocalRandom;

// Consumidor do RabbitMQ: simula o gateway de pagamento.
// Roda em uma thread própria do listener container, separada da requisição HTTP do checkout.
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentProcessor {

    private final PaymentRepository paymentRepository;

    @Value("${app.payment.failure-rate}")
    private double failureRate;

    @Value("${app.payment.processing-delay-ms}")
    private long processingDelayMs;

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    @Transactional
    public void process(PaymentMessage message) {
        Payment payment = paymentRepository.findById(message.paymentId()).orElse(null);
        if (payment == null) {
            log.warn("Pagamento {} não encontrado — mensagem ignorada", message.paymentId());
            return;
        }
        // Proteção contra reprocessamento: só processa quem ainda está PROCESSING
        if (payment.getStatus() != PaymentStatus.PROCESSING) {
            log.info("Pagamento {} já está {} — ignorando", payment.getId(), payment.getStatus());
            return;
        }

        simulateGatewayLatency();

        // failure-rate = 0.0 → sempre aprova. nextDouble() ∈ [0,1); >= 0.0 é sempre verdadeiro.
        boolean approved = ThreadLocalRandom.current().nextDouble() >= failureRate;

        if (approved) {
            payment.setStatus(PaymentStatus.APPROVED);
            Reservation reservation = payment.getReservation();
            // Assentos já foram decrementados na criação da reserva (Fase 3);
            // confirmar só muda o status, impedindo que o scheduler de expiração a libere.
            reservation.setStatus(ReservationStatus.CONFIRMED);
            log.info("Pagamento APROVADO: id={}, reserva CONFIRMADA={}", payment.getId(), reservation.getId());
        } else {
            payment.setStatus(PaymentStatus.DECLINED);
            // Reserva segue PENDING — o usuário pode tentar pagar de novo dentro da janela de 15 min.
            log.info("Pagamento RECUSADO: id={}", payment.getId());
        }
        paymentRepository.save(payment);
    }

    private void simulateGatewayLatency() {
        if (processingDelayMs <= 0) {
            return;
        }
        try {
            Thread.sleep(processingDelayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
