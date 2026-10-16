package com.canhoto.backend;

import com.canhoto.backend.dto.EventStatsDto;
import com.canhoto.backend.dto.OrganizerDashboardDto;
import com.canhoto.backend.dto.TicketValidationResultDto;
import com.canhoto.backend.entity.Event;
import com.canhoto.backend.entity.Reservation;
import com.canhoto.backend.entity.ReservationStatus;
import com.canhoto.backend.entity.Role;
import com.canhoto.backend.entity.TicketSector;
import com.canhoto.backend.entity.User;
import com.canhoto.backend.repository.EventRepository;
import com.canhoto.backend.repository.ReservationRepository;
import com.canhoto.backend.repository.TicketSectorRepository;
import com.canhoto.backend.repository.UserRepository;
import com.canhoto.backend.service.OrganizerDashboardService;
import com.canhoto.backend.service.TicketTokenService;
import com.canhoto.backend.service.TicketValidationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A portaria: o mesmo ingresso não entra duas vezes, e só o organizador do
 * evento consegue dar entrada nele.
 *
 * <p>É a garantia "uso único" que a home promete — até aqui a única sem teste.
 * De carona, confere que o painel do organizador conta quem já entrou.
 */
class PortariaTest extends IntegrationTest {

    @Autowired private TicketValidationService validacao;
    @Autowired private TicketTokenService tokens;
    @Autowired private OrganizerDashboardService painel;
    @Autowired private EventRepository eventRepository;
    @Autowired private TicketSectorRepository ticketSectorRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private UserRepository userRepository;

    private User dono;
    private User outroOrganizador;
    private User cliente;
    private Event evento;
    private TicketSector setor;
    private Reservation reserva;

    @BeforeEach
    void setUp() {
        dono = salvarUsuario("Dono do Evento", Role.ORGANIZADOR);
        outroOrganizador = salvarUsuario("Outro Organizador", Role.ORGANIZADOR);
        cliente = salvarUsuario("Cliente da Portaria", Role.CLIENTE);

        evento = new Event();
        evento.setName("Evento Portaria Test");
        evento.setDate(OffsetDateTime.now().plusDays(10));
        evento.setLocation("Portaria Test");
        evento.setOwner(dono);
        evento = eventRepository.save(evento);

        setor = new TicketSector();
        setor.setEvent(evento);
        setor.setName("Pista Portaria");
        setor.setCapacity(50);
        setor.setAvailableSeats(48);
        setor.setPrice(new BigDecimal("80.00"));
        setor = ticketSectorRepository.save(setor);

        // Uma reserva paga de dois ingressos: um QR só para os dois.
        reserva = new Reservation();
        reserva.setUser(cliente);
        reserva.setTicketSector(setor);
        reserva.setQuantity(2);
        reserva.setTotalPrice(new BigDecimal("160.00"));
        reserva.setStatus(ReservationStatus.CONFIRMED);
        reserva.setExpiresAt(OffsetDateTime.now().plusMinutes(15));
        reserva = reservationRepository.save(reserva);
    }

    @AfterEach
    void tearDown() {
        reservationRepository.findById(reserva.getId()).ifPresent(reservationRepository::delete);
        ticketSectorRepository.findById(setor.getId()).ifPresent(ticketSectorRepository::delete);
        eventRepository.findById(evento.getId()).ifPresent(eventRepository::delete);
        for (User u : new User[] { dono, outroOrganizador, cliente }) {
            userRepository.findById(u.getId()).ifPresent(userRepository::delete);
        }
    }

    private User salvarUsuario(String nome, Role papel) {
        User u = new User();
        u.setName(nome);
        u.setEmail("portaria-" + UUID.randomUUID() + "@test.com");
        u.setPasswordHash("{noop}nao-usada-neste-teste");
        u.setRole(papel);
        return userRepository.save(u);
    }

    @Test
    void primeira_leitura_entra_e_a_segunda_e_recusada() {
        String token = tokens.generate(reserva.getId());

        TicketValidationResultDto primeira = validacao.validate(token, dono.getId());
        TicketValidationResultDto segunda = validacao.validate(token, dono.getId());

        assertThat(primeira.valid()).isTrue();
        assertThat(primeira.reason()).isEqualTo("OK");
        assertThat(segunda.valid()).isFalse();
        assertThat(segunda.reason())
                .as("print, foto ou cópia do mesmo QR não pode entrar de novo")
                .isEqualTo("ALREADY_USED");
    }

    @Test
    void organizador_de_outro_evento_nao_da_entrada_nem_gasta_o_ingresso() {
        String token = tokens.generate(reserva.getId());

        TicketValidationResultDto deFora = validacao.validate(token, outroOrganizador.getId());
        assertThat(deFora.valid()).isFalse();
        assertThat(deFora.reason()).isEqualTo("NOT_OWNER");

        // A tentativa recusada não pode ter marcado o ingresso como usado.
        assertThat(validacao.validate(token, dono.getId()).valid()).isTrue();
    }

    @Test
    void reserva_ainda_nao_paga_nao_entra() {
        reserva.setStatus(ReservationStatus.PENDING);
        reservationRepository.save(reserva);

        TicketValidationResultDto resultado = validacao.validate(tokens.generate(reserva.getId()), dono.getId());

        assertThat(resultado.valid()).isFalse();
        assertThat(resultado.reason()).isEqualTo("NOT_CONFIRMED");
    }

    @Test
    void codigo_adulterado_nao_entra() {
        String token = tokens.generate(reserva.getId());
        char ultimo = token.charAt(token.length() - 1);
        String adulterado = token.substring(0, token.length() - 1) + (ultimo == 'A' ? 'B' : 'A');

        TicketValidationResultDto resultado = validacao.validate(adulterado, dono.getId());

        assertThat(resultado.valid()).isFalse();
        assertThat(resultado.reason()).isEqualTo("INVALID_SIGNATURE");
    }

    @Test
    void painel_conta_os_ingressos_que_ja_entraram() {
        OrganizerDashboardDto antes = painel.getDashboard(dono.getId());
        assertThat(estatisticas(antes).totalCheckedIn()).isZero();

        validacao.validate(tokens.generate(reserva.getId()), dono.getId());

        OrganizerDashboardDto depois = painel.getDashboard(dono.getId());
        EventStatsDto ev = estatisticas(depois);
        // Dois ingressos na mesma reserva: os dois entram com um QR só.
        assertThat(ev.totalSold()).isEqualTo(2);
        assertThat(ev.totalCheckedIn()).isEqualTo(2);
        assertThat(ev.sectors()).singleElement().satisfies(s -> assertThat(s.checkedIn()).isEqualTo(2));
        assertThat(depois.totalCheckedIn()).isEqualTo(2);
    }

    private EventStatsDto estatisticas(OrganizerDashboardDto painelDoDono) {
        return painelDoDono.events().stream()
                .filter(e -> e.eventId().equals(evento.getId()))
                .findFirst()
                .orElseThrow();
    }
}
