package com.canhoto.backend;

import com.canhoto.backend.dto.TicketSectorResponseDto;
import com.canhoto.backend.entity.Event;
import com.canhoto.backend.entity.TicketSector;
import com.canhoto.backend.repository.EventRepository;
import com.canhoto.backend.repository.TicketSectorRepository;
import com.canhoto.backend.service.EventService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Os setores de um evento sempre na mesma ordem, do mais barato ao mais caro.
 *
 * <p>Antes vinham na ordem física da tabela. O Postgres grava cada UPDATE como
 * uma linha nova no fim da página, então reservar um lugar (que baixa as vagas
 * do setor) mandava aquele setor para o fim da lista — e na tela do evento o
 * setor que a pessoa acabou de escolher pulava de posição.
 */
class EventSectorOrderTest extends IntegrationTest {

    @Autowired private EventService eventService;
    @Autowired private EventRepository eventRepository;
    @Autowired private TicketSectorRepository ticketSectorRepository;

    private UUID eventId;

    @BeforeEach
    void setUp() {
        Event event = new Event();
        event.setName("Evento Ordem dos Setores Test");
        event.setDate(OffsetDateTime.now().plusDays(30));
        event.setLocation("Test Arena");
        eventId = eventRepository.save(event).getId();

        // Gravados fora da ordem de preço de propósito.
        setor(event, "Camarote", "300.00");
        setor(event, "Pista", "100.00");
        setor(event, "Meia", "50.00");
    }

    @AfterEach
    void tearDown() {
        ticketSectorRepository.deleteAll(ticketSectorRepository.findByEventId(eventId));
        eventRepository.deleteById(eventId);
    }

    @Test
    void setores_vem_do_mais_barato_ao_mais_caro() {
        assertThat(nomes()).containsExactly("Meia", "Pista", "Camarote");
    }

    @Test
    void ordem_nao_muda_depois_que_um_setor_e_atualizado() {
        // O que uma reserva faz com o setor: baixa as vagas (um UPDATE na linha).
        TicketSector meia = ticketSectorRepository.findByEventId(eventId).stream()
                .filter(s -> s.getName().equals("Meia")).findFirst().orElseThrow();
        meia.setAvailableSeats(meia.getAvailableSeats() - 1);
        ticketSectorRepository.saveAndFlush(meia);

        assertThat(nomes()).containsExactly("Meia", "Pista", "Camarote");
    }

    private List<String> nomes() {
        return eventService.findById(eventId).sectors().stream().map(TicketSectorResponseDto::name).toList();
    }

    private void setor(Event event, String nome, String preco) {
        TicketSector setor = new TicketSector();
        setor.setEvent(event);
        setor.setName(nome);
        setor.setCapacity(10);
        setor.setAvailableSeats(10);
        setor.setPrice(new BigDecimal(preco));
        ticketSectorRepository.save(setor);
    }
}
