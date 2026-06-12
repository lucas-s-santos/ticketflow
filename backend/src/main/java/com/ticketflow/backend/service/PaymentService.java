package com.ticketflow.backend.service;

import com.ticketflow.backend.config.RabbitMQConfig;
import com.ticketflow.backend.dto.PaymentMessage;
import com.ticketflow.backend.dto.PaymentRequestDto;
import com.ticketflow.backend.dto.PaymentResponseDto;
import com.ticketflow.backend.entity.Payment;
import com.ticketflow.backend.entity.PaymentStatus;
import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import com.ticketflow.backend.exception.ResourceNotFoundException;
import com.ticketflow.backend.repository.PaymentRepository;
import com.ticketflow.backend.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public PaymentResponseDto checkout(UUID userId, PaymentRequestDto dto, String idempotencyKey) {
        // 1. Idempotência: se a chave já foi usada, devolve o mesmo pagamento.
        //    Cliente que clica duas vezes ou rede que repete a requisição não gera cobrança dupla.
        var existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            log.info("Checkout idempotente: chave {} já processada, retornando pagamento existente", idempotencyKey);
            return toResponseDto(existing.get());
        }

        // 2. Carrega e valida a reserva
        Reservation reservation = reservationRepository.findById(dto.reservationId())
                .orElseThrow(() -> new ResourceNotFoundException("Reserva não encontrada: " + dto.reservationId()));

        if (!reservation.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Esta reserva não pertence ao usuário");
        }
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalStateException(
                    "Apenas reservas PENDING podem ser pagas. Status atual: " + reservation.getStatus());
        }

        // 3. Cria o pagamento em PROCESSING
        Payment payment = new Payment();
        payment.setReservation(reservation);
        payment.setIdempotencyKey(idempotencyKey);
        payment.setAmount(reservation.getTotalPrice());
        payment.setMethod(dto.method());
        payment.setStatus(PaymentStatus.PROCESSING);

        Payment saved;
        try {
            saved = paymentRepository.saveAndFlush(payment);
        } catch (DataIntegrityViolationException e) {
            // Corrida: duas requisições com a mesma chave chegaram quase juntas.
            // A constraint UNIQUE rejeitou a segunda — recarrega e devolve a vencedora.
            log.info("Corrida de idempotência na chave {} — retornando pagamento existente", idempotencyKey);
            return toResponseDto(paymentRepository.findByIdempotencyKey(idempotencyKey)
                    .orElseThrow(() -> e));
        }

        // 4. Publica a mensagem para processamento assíncrono pelo "gateway"
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ROUTING_KEY,
                new PaymentMessage(saved.getId()));

        log.info("Checkout iniciado: pagamento={}, reserva={}, valor={}",
                saved.getId(), reservation.getId(), saved.getAmount());
        return toResponseDto(saved);
    }

    @Transactional(readOnly = true)
    public PaymentResponseDto findById(UUID paymentId, UUID userId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento não encontrado: " + paymentId));

        if (!payment.getReservation().getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Este pagamento não pertence ao usuário");
        }
        return toResponseDto(payment);
    }

    private PaymentResponseDto toResponseDto(Payment p) {
        return new PaymentResponseDto(
                p.getId(),
                p.getReservation().getId(),
                p.getAmount(),
                p.getMethod().name(),
                p.getStatus().name(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
