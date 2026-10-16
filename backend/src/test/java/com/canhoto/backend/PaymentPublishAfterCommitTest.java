package com.canhoto.backend;

import com.canhoto.backend.config.RabbitMQConfig;
import com.canhoto.backend.dto.PaymentMessage;
import com.canhoto.backend.dto.PaymentRequestDto;
import com.canhoto.backend.entity.*;
import com.canhoto.backend.repository.*;
import com.canhoto.backend.service.PaymentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * A mensagem para o gateway só pode sair depois do commit do checkout.
 *
 * <p>Antes, ela era publicada dentro da transação. O consumidor roda em outra
 * conexão e às vezes lia o pagamento antes de o INSERT ficar visível: não o
 * encontrava, descartava a mensagem, e o pagamento ficava em PROCESSING para
 * sempre — a pessoa pagava e a reserva expirava. Na máquina de desenvolvimento
 * isso acontecia em 2 de cada 3 checkouts.
 *
 * <p>O teste roda o checkout dentro de uma transação aberta por fora e confere
 * que nada foi publicado enquanto ela não terminou.
 */
@TestPropertySource(properties = "app.payment.processing-delay-ms=0")
class PaymentPublishAfterCommitTest extends IntegrationTest {

    @SpyBean private RabbitTemplate rabbitTemplate;

    @Autowired private PaymentService paymentService;
    @Autowired private PlatformTransactionManager transactionManager;
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
        event.setName("Evento Publicação Test");
        event.setDate(OffsetDateTime.now().plusDays(30));
        event.setLocation("Test Arena");
        eventId = eventRepository.save(event).getId();

        TicketSector sector = new TicketSector();
        sector.setEvent(event);
        sector.setName("Pista Test");
        sector.setCapacity(100);
        sector.setAvailableSeats(99);
        sector.setPrice(new BigDecimal("80.00"));
        sectorId = ticketSectorRepository.save(sector).getId();

        User user = new User();
        user.setName("Cliente Publicação");
        user.setEmail("publish-test-" + UUID.randomUUID() + "@test.com");
        user.setPasswordHash(passwordEncoder.encode("senha123"));
        user.setRole(Role.CLIENTE);
        userId = userRepository.save(user).getId();

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setTicketSector(sector);
        reservation.setQuantity(1);
        reservation.setTotalPrice(new BigDecimal("80.00"));
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
    void mensagem_do_gateway_so_sai_depois_do_commit() {
        PaymentRequestDto dto = new PaymentRequestDto(reservationId, PaymentMethod.PIX);
        AtomicReference<UUID> pagamentoId = new AtomicReference<>();

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            pagamentoId.set(paymentService.checkout(userId, dto, UUID.randomUUID().toString()).id());

            // Ainda dentro da transação: o pagamento não existe para o consumidor.
            verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class));
        });

        // Depois do commit sai exatamente uma mensagem, apontando para o pagamento criado.
        ArgumentCaptor<Object> mensagem = ArgumentCaptor.forClass(Object.class);
        verify(rabbitTemplate).convertAndSend(
                eq(RabbitMQConfig.EXCHANGE), eq(RabbitMQConfig.ROUTING_KEY), mensagem.capture());
        assertThat(mensagem.getValue())
                .isInstanceOfSatisfying(PaymentMessage.class,
                        m -> assertThat(m.paymentId()).isEqualTo(pagamentoId.get()));
    }
}
