package com.ticketflow.backend;

import com.ticketflow.backend.dto.ReservationRequestDto;
import com.ticketflow.backend.entity.*;
import com.ticketflow.backend.repository.*;
import com.ticketflow.backend.service.ReservationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Teste de concorrência: verifica que o lock pessimista impede a sobrevenda de ingressos.
 *
 * Requer: PostgreSQL rodando (docker compose up -d).
 * Não usa H2 pois dependemos de tipos nativos do Postgres (reservation_status ENUM, TIMESTAMPTZ).
 *
 * Cenário: 20 threads tentam reservar 1 ingresso simultaneamente em um setor com 5 vagas.
 * Resultado esperado: exatamente 5 sucesses, 15 falhas, available_seats == 0.
 */
@SpringBootTest
class ReservationConcurrencyTest {

    @Autowired private ReservationService reservationService;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private TicketSectorRepository ticketSectorRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final int AVAILABLE_SEATS = 5;
    private static final int THREAD_COUNT = 20;

    private UUID sectorId;
    private List<UUID> userIds;

    @BeforeEach
    void setUp() {
        // Cria evento de teste
        Event event = new Event();
        event.setName("Evento Concorrência Test");
        event.setDate(OffsetDateTime.now().plusDays(30));
        event.setLocation("Test Arena");
        Event savedEvent = eventRepository.save(event);

        // Cria setor com 5 vagas
        TicketSector sector = new TicketSector();
        sector.setEvent(savedEvent);
        sector.setName("Pista Test");
        sector.setCapacity(AVAILABLE_SEATS);
        sector.setAvailableSeats(AVAILABLE_SEATS);
        sector.setPrice(new BigDecimal("100.00"));
        sectorId = ticketSectorRepository.save(sector).getId();

        // Cria 20 usuários distintos (1 por thread, para não violar restrição de email)
        userIds = new ArrayList<>();
        for (int i = 0; i < THREAD_COUNT; i++) {
            User user = new User();
            user.setName("Usuário Teste " + i);
            user.setEmail("concurrency-test-" + UUID.randomUUID() + "@test.com");
            user.setPasswordHash(passwordEncoder.encode("senha123"));
            user.setRole(Role.CLIENTE);
            userIds.add(userRepository.save(user).getId());
        }
    }

    @AfterEach
    void tearDown() {
        // Remove dados de teste na ordem certa (respeita FKs)
        reservationRepository.findByStatusAndExpiresAtBefore(ReservationStatus.PENDING,
                OffsetDateTime.now().plusHours(1))
                .forEach(r -> reservationRepository.delete(r));
        reservationRepository.findAll().stream()
                .filter(r -> userIds.contains(r.getUser().getId()))
                .forEach(reservationRepository::delete);
        ticketSectorRepository.findById(sectorId).ifPresent(ticketSectorRepository::delete);
        userIds.forEach(id -> userRepository.findById(id).ifPresent(userRepository::delete));
    }

    @Test
    void devem_ser_criadas_exatamente_N_reservas_para_N_vagas() throws InterruptedException {
        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger failures = new AtomicInteger(0);

        // Trava de largada: todos os threads ficam esperando até countDown() ser chamado.
        // Isso maximiza a simultaneidade — sem ela, threads começariam em sequência.
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch endGate = new CountDownLatch(THREAD_COUNT);

        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);

        for (int i = 0; i < THREAD_COUNT; i++) {
            final UUID userId = userIds.get(i);
            pool.submit(() -> {
                try {
                    startGate.await(); // espera todas as threads estarem prontas
                    reservationService.reserve(userId, new ReservationRequestDto(sectorId, 1));
                    successes.incrementAndGet();
                } catch (Exception e) {
                    failures.incrementAndGet();
                } finally {
                    endGate.countDown();
                }
            });
        }

        startGate.countDown(); // dispara todas as threads ao mesmo tempo
        boolean finished = endGate.await(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(finished).as("Todas as threads devem terminar em 30s").isTrue();
        assertThat(successes.get())
                .as("Exatamente %d reservas devem ser criadas (= vagas disponíveis)", AVAILABLE_SEATS)
                .isEqualTo(AVAILABLE_SEATS);
        assertThat(failures.get())
                .as("As %d threads excedentes devem falhar", THREAD_COUNT - AVAILABLE_SEATS)
                .isEqualTo(THREAD_COUNT - AVAILABLE_SEATS);

        // Verifica o estado final no banco
        TicketSector finalSector = ticketSectorRepository.findById(sectorId).get();
        assertThat(finalSector.getAvailableSeats())
                .as("available_seats deve ser 0 após todas as reservas")
                .isEqualTo(0);
    }
}
