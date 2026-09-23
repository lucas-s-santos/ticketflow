package com.canhoto.backend;

import com.canhoto.backend.entity.*;
import com.canhoto.backend.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prova que o scheduler de expiração é seguro com mais de uma instância.
 *
 * <p>Duas transações simultâneas pedem um lote de reservas vencidas. Com
 * {@code FOR UPDATE SKIP LOCKED}, a segunda pula as linhas que a primeira já
 * travou em vez de esperar por elas — então os dois lotes não se sobrepõem.
 *
 * <p>Sem o {@code SKIP LOCKED} este teste falharia de duas formas: as duas
 * transações leriam as mesmas linhas (lotes idênticos) ou a segunda ficaria
 * bloqueada até a primeira terminar.
 */
class ExpirationSkipLockedTest extends IntegrationTest {

    private static final int TOTAL_DE_RESERVAS = 6;
    private static final int TAMANHO_DO_LOTE = 3;

    @Autowired private ReservationRepository reservationRepository;
    @Autowired private TicketSectorRepository ticketSectorRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PlatformTransactionManager transactionManager;

    private UUID eventoId;
    private UUID setorId;
    private UUID usuarioId;
    private final List<UUID> reservaIds = new ArrayList<>();

    @BeforeEach
    void prepararReservasVencidas() {
        Event evento = new Event();
        evento.setName("Evento SkipLocked Test");
        evento.setDate(OffsetDateTime.now().plusDays(30));
        evento.setLocation("Test Arena");
        eventoId = eventRepository.save(evento).getId();

        TicketSector setor = new TicketSector();
        setor.setEvent(evento);
        setor.setName("Pista SkipLocked");
        setor.setCapacity(100);
        setor.setAvailableSeats(100 - TOTAL_DE_RESERVAS);
        setor.setPrice(new BigDecimal("50.00"));
        setorId = ticketSectorRepository.save(setor).getId();

        User usuario = new User();
        usuario.setName("Cliente SkipLocked");
        usuario.setEmail("skiplocked-" + UUID.randomUUID() + "@test.com");
        usuario.setPasswordHash(passwordEncoder.encode("senha123"));
        usuario.setRole(Role.CLIENTE);
        usuarioId = userRepository.save(usuario).getId();

        // Todas já vencidas: expires_at no passado e status ainda PENDING.
        for (int i = 0; i < TOTAL_DE_RESERVAS; i++) {
            Reservation reserva = new Reservation();
            reserva.setUser(usuario);
            reserva.setTicketSector(setor);
            reserva.setQuantity(1);
            reserva.setTotalPrice(new BigDecimal("50.00"));
            reserva.setStatus(ReservationStatus.PENDING);
            reserva.setExpiresAt(OffsetDateTime.now().minusMinutes(5));
            reservaIds.add(reservationRepository.save(reserva).getId());
        }
    }

    @AfterEach
    void limpar() {
        reservaIds.forEach(id -> reservationRepository.findById(id).ifPresent(reservationRepository::delete));
        reservaIds.clear();
        ticketSectorRepository.findById(setorId).ifPresent(ticketSectorRepository::delete);
        eventRepository.findById(eventoId).ifPresent(eventRepository::delete);
        userRepository.findById(usuarioId).ifPresent(userRepository::delete);
    }

    @Test
    void duas_instancias_recebem_lotes_disjuntos() throws InterruptedException {
        TransactionTemplate transacao = new TransactionTemplate(transactionManager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        Set<UUID> loteA = new HashSet<>();
        Set<UUID> loteB = new HashSet<>();

        CountDownLatch aTravou = new CountDownLatch(1);
        CountDownLatch bTerminou = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        // A trava seu lote e SEGURA a transação aberta enquanto B consulta.
        pool.submit(() -> transacao.execute(status -> {
            reservationRepository.travarVencidasParaExpirar(TAMANHO_DO_LOTE)
                    .forEach(r -> loteA.add(r.getId()));
            aTravou.countDown();
            try {
                bTerminou.await(20, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return null;
        }));

        pool.submit(() -> {
            try {
                aTravou.await(20, TimeUnit.SECONDS);
                transacao.execute(status -> {
                    reservationRepository.travarVencidasParaExpirar(TAMANHO_DO_LOTE)
                            .forEach(r -> loteB.add(r.getId()));
                    return null;
                });
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                bTerminou.countDown();
            }
            return null;
        });

        assertThat(bTerminou.await(30, TimeUnit.SECONDS))
                .as("B não pode ficar bloqueado esperando A: SKIP LOCKED existe justamente para isso")
                .isTrue();
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        assertThat(loteA).as("A deve ter travado um lote cheio").hasSize(TAMANHO_DO_LOTE);
        assertThat(loteB).as("B deve ter conseguido as reservas restantes").hasSize(TAMANHO_DO_LOTE);

        assertThat(loteA)
                .as("nenhuma reserva pode aparecer nos dois lotes — seria vaga devolvida em dobro")
                .doesNotContainAnyElementsOf(loteB);
    }
}
