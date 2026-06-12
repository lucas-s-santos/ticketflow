package com.ticketflow.backend.service;

import com.ticketflow.backend.dto.EventRequestDto;
import com.ticketflow.backend.dto.EventResponseDto;
import com.ticketflow.backend.dto.TicketSectorResponseDto;
import com.ticketflow.backend.entity.Event;
import com.ticketflow.backend.entity.TicketSector;
import com.ticketflow.backend.entity.User;
import com.ticketflow.backend.exception.ResourceNotFoundException;
import com.ticketflow.backend.repository.EventRepository;
import com.ticketflow.backend.repository.TicketSectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EventService {

    private final EventRepository eventRepository;
    private final TicketSectorRepository ticketSectorRepository;

    @Transactional(readOnly = true)
    public List<EventResponseDto> findAll() {
        return eventRepository.findAllByOrderByDateAsc()
                .stream()
                .map(event -> toResponseDto(event, ticketSectorRepository.findByEventId(event.getId())))
                .toList();
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
        Event saved = eventRepository.save(event);

        List<TicketSector> sectors = saveSectors(saved, dto);
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
        eventRepository.save(event);

        // Substitui todos os setores: deleta os antigos e cria novos.
        ticketSectorRepository.deleteByEventId(id);
        List<TicketSector> sectors = saveSectors(event, dto);
        return toResponseDto(event, sectors);
    }

    public void delete(UUID id, User currentUser) {
        Event event = findEventOrThrow(id);
        assertOwnership(event, currentUser);
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

    private List<TicketSector> saveSectors(Event event, EventRequestDto dto) {
        if (dto.sectors() == null || dto.sectors().isEmpty()) {
            return Collections.emptyList();
        }
        List<TicketSector> sectors = dto.sectors().stream().map(sectorDto -> {
            TicketSector s = new TicketSector();
            s.setEvent(event);
            s.setName(sectorDto.name());
            s.setCapacity(sectorDto.capacity());
            s.setAvailableSeats(sectorDto.capacity()); // disponível = capacidade total na criação
            s.setPrice(sectorDto.price());
            return s;
        }).toList();
        return ticketSectorRepository.saveAll(sectors);
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
                event.getDate(), event.getLocation(), event.getCreatedAt(), sectorDtos
        );
    }
}
