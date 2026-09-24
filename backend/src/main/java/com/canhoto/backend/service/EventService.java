package com.canhoto.backend.service;

import com.canhoto.backend.dto.EventRequestDto;
import com.canhoto.backend.dto.EventResponseDto;
import com.canhoto.backend.dto.PageResponseDto;
import com.canhoto.backend.dto.TicketSectorRequestDto;
import com.canhoto.backend.dto.TicketSectorResponseDto;
import com.canhoto.backend.entity.Event;
import com.canhoto.backend.entity.TicketSector;
import com.canhoto.backend.entity.User;
import com.canhoto.backend.exception.BusinessRuleException;
import com.canhoto.backend.exception.ResourceNotFoundException;
import com.canhoto.backend.repository.EventRepository;
import com.canhoto.backend.repository.EventSpecifications;
import com.canhoto.backend.repository.ReservationRepository;
import com.canhoto.backend.repository.TicketSectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EventService {

    private final EventRepository eventRepository;
    private final TicketSectorRepository ticketSectorRepository;
    private final ReservationRepository reservationRepository;

    /**
     * Listagem publica paginada.
     *
     * <p>Duas consultas, independentemente do tamanho da pagina: uma para os
     * eventos e uma para os setores de todos eles. A versao anterior devolvia
     * a tabela inteira e disparava uma consulta de setor por evento.
     */
    @Transactional(readOnly = true)
    public PageResponseDto<EventResponseDto> findAll(
            String texto, OffsetDateTime de, OffsetDateTime ate, boolean apenasComVagas, Pageable pageable) {

        Page<Event> pagina = eventRepository.findAll(
                EventSpecifications.comFiltros(texto, de, ate, apenasComVagas), pageable);

        List<UUID> ids = pagina.getContent().stream().map(Event::getId).toList();
        Map<UUID, List<TicketSector>> setoresPorEvento = ids.isEmpty()
                ? Map.of()
                : ticketSectorRepository.findByEventIdIn(ids).stream()
                        .collect(Collectors.groupingBy(setor -> setor.getEvent().getId()));

        return PageResponseDto.of(pagina,
                evento -> toResponseDto(evento, setoresPorEvento.getOrDefault(evento.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public EventResponseDto findById(UUID id) {
        Event event = findEventOrThrow(id);
        List<TicketSector> sectors = ticketSectorRepository.findByEventId(id);
        return toResponseDto(event, sectors);
    }

    public EventResponseDto create(EventRequestDto dto, User owner) {
        Event event = new Event();
        event.setOwner(owner);   // vincula o evento ao organizador que o criou
        event.setName(dto.name());
        event.setDescription(dto.description());
        event.setDate(dto.date());
        event.setLocation(dto.location());
        event.setCoverImageUrl(normalizarUrl(dto.coverImageUrl()));
        Event saved = eventRepository.save(event);

        List<TicketSector> sectors = createSectors(saved, dto.sectors());
        log.info("Evento criado: id={}, dono={}, setores={}", saved.getId(), owner.getId(), sectors.size());
        return toResponseDto(saved, sectors);
    }

    public EventResponseDto update(UUID id, EventRequestDto dto, User currentUser) {
        Event event = findEventOrThrow(id);
        assertOwnership(event, currentUser);
        event.setName(dto.name());
        event.setDescription(dto.description());
        event.setDate(dto.date());
        event.setLocation(dto.location());
        event.setCoverImageUrl(normalizarUrl(dto.coverImageUrl()));
        eventRepository.save(event);

        List<TicketSector> sectors = syncSectors(event, dto.sectors());
        return toResponseDto(event, sectors);
    }

    public void delete(UUID id, User currentUser) {
        Event event = findEventOrThrow(id);
        assertOwnership(event, currentUser);

        // A FK reservations -> ticket_sectors é RESTRICT. Sem esta checagem, o CASCADE de
        // events -> ticket_sectors tentaria apagar setores que têm reserva, o Postgres
        // recusaria e a requisição terminava em 500.
        if (reservationRepository.existsByEventId(id)) {
            throw new BusinessRuleException(
                    "Não é possível excluir um evento que já possui reservas. " +
                    "Cancele as reservas antes ou mantenha o evento no histórico.");
        }

        // Setores são deletados automaticamente pelo ON DELETE CASCADE do banco (V3 migration).
        eventRepository.deleteById(id);
        log.info("Evento removido: id={}", id);
    }

    // Eventos com dono só podem ser alterados pelo dono.
    // Eventos legados (sem dono, criados antes da Fase 6) continuam editáveis por qualquer organizador.
    private void assertOwnership(Event event, User currentUser) {
        if (event.getOwner() != null && !event.getOwner().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Este evento pertence a outro organizador");
        }
    }

    private List<TicketSector> createSectors(Event event, List<TicketSectorRequestDto> incoming) {
        if (incoming == null || incoming.isEmpty()) {
            return Collections.emptyList();
        }
        List<TicketSector> sectors = incoming.stream()
                .map(dto -> newSector(event, dto))
                .toList();
        return ticketSectorRepository.saveAll(sectors);
    }

    /**
     * Reconcilia os setores do evento com o que veio na requisição, em vez de apagar todos
     * e recriar. Apagar tinha três problemas: violava a FK das reservas (500), gerava ids
     * novos que deixavam as reservas antigas órfãs, e devolvia available_seats para capacity,
     * apagando o registro do que já tinha sido vendido.
     *
     * Setor sem id é novo. Com id conhecido é atualizado, preservando os ingressos já tomados.
     * Ausente da requisição é removido — desde que ainda não tenha nenhuma reserva.
     */
    private List<TicketSector> syncSectors(Event event, List<TicketSectorRequestDto> incoming) {
        List<TicketSectorRequestDto> requested = incoming == null ? Collections.emptyList() : incoming;
        List<TicketSector> existing = ticketSectorRepository.findByEventId(event.getId());

        Map<UUID, TicketSector> existingById = new HashMap<>();
        for (TicketSector sector : existing) {
            existingById.put(sector.getId(), sector);
        }

        Set<UUID> keptIds = new HashSet<>();
        for (TicketSectorRequestDto dto : requested) {
            if (dto.id() != null) {
                keptIds.add(dto.id());
            }
        }

        // 1. Remove os setores que sumiram da requisição, barrando os que já têm reserva.
        for (TicketSector sector : existing) {
            if (keptIds.contains(sector.getId())) {
                continue;
            }
            if (reservationRepository.existsByTicketSectorId(sector.getId())) {
                throw new BusinessRuleException(
                        "Não é possível remover o setor " + sector.getName() +
                        ": já existem reservas para ele.");
            }
            ticketSectorRepository.delete(sector);
        }

        // 2. Atualiza os que continuam e cria os novos.
        List<TicketSector> result = new ArrayList<>();
        for (TicketSectorRequestDto dto : requested) {
            TicketSector current = dto.id() == null ? null : existingById.get(dto.id());
            if (current == null) {
                result.add(newSector(event, dto));
                continue;
            }

            // capacity - availableSeats = ingressos já tomados (PENDING ou CONFIRMED).
            // A nova capacidade não pode ficar abaixo disso, senão available_seats viraria
            // negativo e o setor passaria a vender assentos que não existem.
            int taken = current.getCapacity() - current.getAvailableSeats();
            if (dto.capacity() < taken) {
                throw new BusinessRuleException(
                        "A capacidade do setor " + current.getName() + " não pode ser menor que " +
                        taken + ": esse é o número de ingressos já reservados.");
            }

            current.setName(dto.name());
            current.setCapacity(dto.capacity());
            current.setAvailableSeats(dto.capacity() - taken);
            current.setPrice(dto.price());
            result.add(current);
        }

        return ticketSectorRepository.saveAll(result);
    }

    private TicketSector newSector(Event event, TicketSectorRequestDto dto) {
        TicketSector sector = new TicketSector();
        sector.setEvent(event);
        sector.setName(dto.name());
        sector.setCapacity(dto.capacity());
        sector.setAvailableSeats(dto.capacity()); // disponível = capacidade total na criação
        sector.setPrice(dto.price());
        return sector;
    }

    // Campo vazio vindo de um formulario chega como "" e nao como null.
    // Sem isto, o front receberia string vazia e tentaria renderizar <img src="">,
    // que dispara uma requisicao inutil para a propria pagina.
    private String normalizarUrl(String url) {
        return (url == null || url.isBlank()) ? null : url.trim();
    }

    private Event findEventOrThrow(UUID id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento não encontrado com id: " + id));
    }

    private EventResponseDto toResponseDto(Event event, List<TicketSector> sectors) {
        List<TicketSectorResponseDto> sectorDtos = sectors.stream()
                .map(s -> new TicketSectorResponseDto(s.getId(), s.getName(), s.getCapacity(),
                        s.getAvailableSeats(), s.getPrice()))
                .toList();
        return new EventResponseDto(
                event.getId(), event.getName(), event.getDescription(),
                event.getDate(), event.getLocation(), event.getCoverImageUrl(),
                event.getCreatedAt(), sectorDtos
        );
    }
}
