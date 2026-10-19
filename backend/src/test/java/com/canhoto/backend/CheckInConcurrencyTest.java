package com.canhoto.backend;

import com.canhoto.backend.dto.TicketValidationResultDto;
import com.canhoto.backend.entity.*;
import com.canhoto.backend.repository.*;
import com.canhoto.backend.service.TicketTokenService;
import com.canhoto.backend.service.TicketValidationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O mesmo canhoto lido várias vezes ao mesmo tempo na portaria entra uma vez só.
 *
 * <p>Antes o check-in lia {@code checkedInAt == null} e gravava em seguida: as
 * leituras simultâneas viam todas "ainda não usado" e liberavam todas. É o caso
 * de dois leitores na mesma entrada, ou de um print do ingresso passado adiante.
 */
class CheckInConcurrencyTest extends IntegrationTest {

    private static final int LEITURAS = 10;

    @Autowired private TicketValidationService ticketValidationService;
    @Autowired private TicketTokenService ticketTokenService;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private TicketSectorRepository ticketSectorRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private UUID organizadorId;
    private UUID clienteId;
    private UUID eventId;
    private UUID sectorId;
    private UUID reservationId;

    @BeforeEach
    void setUp() {
        User organizador = usuario("Organizador Check-in", Role.ORGANIZADOR);
        User cliente = usuario("Cliente Check-in", Role.CLIENTE);
        organizadorId = organizador.getId();
        clienteId = cliente.getId();

        Event event = new Event();
        event.setName("Evento Check-in Test");
        event.setDate(OffsetDateTime.now().plusDays(30));
        event.setLocation("Test Arena");
        event.setOwner(organizador);
        eventId = eventRepository.save(event).getId();

        TicketSector sector = new TicketSector();
        sector.setEvent(event);
        sector.setName("Pista Test");
        sector.setCapacity(10);
        sector.setAvailableSeats(9);
        sector.setPrice(new BigDecimal("80.00"));
        sectorId = ticketSectorRepository.save(sector).getId();

        Reservation reservation = new Reservation();
        reservation.setUser(cliente);
        reservation.setTicketSector(sector);
        reservation.setQuantity(1);
        reservation.setTotalPrice(new BigDecimal("80.00"));
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setExpiresAt(OffsetDateTime.now().plusMinutes(15));
        reservationId = reservationRepository.save(reservation).getId();
    }

    @AfterEach
    void tearDown() {
        reservationRepository.findById(reservationId).ifPresent(reservationRepository::delete);
        ticketSectorRepository.findById(sectorId).ifPresent(ticketSectorRepository::delete);
        eventRepository.findById(eventId).ifPresent(eventRepository::delete);
        userRepository.findById(clienteId).ifPresent(userRepository::delete);
        userRepository.findById(organizadorId).ifPresent(userRepository::delete);
    }

    @Test
    void leituras_simultaneas_do_mesmo_qr_liberam_uma_entrada_so() throws InterruptedException {
        String token = ticketTokenService.generate(reservationId);
        List<TicketValidationResultDto> resultados = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> erros = Collections.synchronizedList(new ArrayList<>());

        // Todas esperam na largada para chegarem juntas ao banco.
        CountDownLatch largada = new CountDownLatch(1);
        CountDownLatch chegada = new CountDownLatch(LEITURAS);
        ExecutorService leitores = Executors.newFixedThreadPool(LEITURAS);
        for (int i = 0; i < LEITURAS; i++) {
            leitores.submit(() -> {
                try {
                    largada.await();
                    resultados.add(ticketValidationService.validate(token, organizadorId));
                } catch (Throwable e) {
                    erros.add(e);
                } finally {
                    chegada.countDown();
                }
            });
        }
        largada.countDown();
        assertThat(chegada.await(30, TimeUnit.SECONDS)).as("todas as leituras terminam em 30 s").isTrue();
        leitores.shutdown();

        assertThat(erros).isEmpty();
        assertThat(resultados.stream().filter(TicketValidationResultDto::valid).count())
                .as("só uma leitura pode liberar a entrada")
                .isEqualTo(1);
        assertThat(resultados)
                .filteredOn(r -> !r.valid())
                .hasSize(LEITURAS - 1)
                .allSatisfy(r -> {
                    assertThat(r.reason()).isEqualTo("ALREADY_USED");
                    assertThat(r.checkedInAt()).as("a recusa mostra quando foi a entrada").isNotNull();
                });
    }

    private User usuario(String nome, Role papel) {
        User user = new User();
        user.setName(nome);
        user.setEmail("checkin-test-" + UUID.randomUUID() + "@test.com");
        user.setPasswordHash(passwordEncoder.encode("senha123"));
        user.setRole(papel);
        return userRepository.save(user);
    }
}
