package com.ticketflow.backend;

import com.ticketflow.backend.dto.PaymentRequestDto;
import com.ticketflow.backend.dto.PaymentResponseDto;
import com.ticketflow.backend.entity.*;
import com.ticketflow.backend.repository.*;
import com.ticketflow.backend.service.PaymentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica o ponto central da idempotência: dois checkouts com a MESMA Idempotency-Key
 * geram apenas UM pagamento (sem cobrança duplicada).
 *
 * Requer Postgres + RabbitMQ rodando (docker compose up -d).
 * Delay do gateway zerado para o teste não esperar pela simulação.
 */
@SpringBootTest
@TestPropertySource(properties = "app.payment.processing-delay-ms=0")
class PaymentIdempotencyTest {

    @Autowired private PaymentService paymentService;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private TicketSectorRepository ticketSectorRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private UUID userId;
    private UUID reservationId;
    private UUID sectorId;
    private UUID eventId;

    @BeforeEach
    void setUp() {
        Event event = new Event();
        event.setName("Evento Idempotência Test");
        event.setDate(OffsetDateTime.now().plusDays(30));
        event.setLocation("Test Arena");
        eventId = eventRepository.save(event).getId();

        TicketSector sector = new TicketSector();
        sector.setEvent(event);
        sector.setName("Pista Test");
        sector.setCapacity(100);
        sector.setAvailableSeats(98); // 2 já reservados abaixo
        sector.setPrice(new BigDecimal("150.00"));
        sectorId = ticketSectorRepository.save(sector).getId();

        User user = new User();
        user.setName("Cliente Idempotência");
        user.setEmail("idempotency-test-" + UUID.randomUUID() + "@test.com");
        user.setPasswordHash(passwordEncoder.encode("senha123"));
        user.setRole(Role.CLIENTE);
        userId = userRepository.save(user).getId();

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setTicketSector(sector);
        reservation.setQuantity(2);
        reservation.setTotalPrice(new BigDecimal("300.00"));
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setExpiresAt(OffsetDateTime.now().plusMinutes(15));
        reservationId = reservationRepository.save(reservation).getId();
    }

    @AfterEach
    void tearDown() {
        paymentRepository.findByReservationId(reservationId).ifPresent(paymentRepository::delete);
        reservationRepository.findById(reservationId).ifPresent(reservationRepository::delete);
        ticketSectorRepository.findById(sectorId).ifPresent(ticketSectorRepository::delete);
        eventRepository.findById(eventId).ifPresent(eventRepository::delete);
        userRepository.findById(userId).ifPresent(userRepository::delete);
    }

    @Test
    void dois_checkouts_com_mesma_chave_geram_um_unico_pagamento() {
        String idempotencyKey = UUID.randomUUID().toString();
        PaymentRequestDto dto = new PaymentRequestDto(reservationId, PaymentMethod.PIX);

        PaymentResponseDto first = paymentService.checkout(userId, dto, idempotencyKey);
        PaymentResponseDto second = paymentService.checkout(userId, dto, idempotencyKey);

        // Mesma chave → mesmo pagamento
        assertThat(second.id())
                .as("Segundo checkout deve retornar o mesmo pagamento do primeiro")
                .isEqualTo(first.id());

        // E apenas um registro no banco
        long count = paymentRepository.findAll().stream()
                .filter(p -> p.getIdempotencyKey().equals(idempotencyKey))
                .count();
        assertThat(count)
                .as("Deve existir exatamente 1 pagamento para a chave de idempotência")
                .isEqualTo(1);
    }
}
