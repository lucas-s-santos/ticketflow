package com.ticketflow.backend.service;

import com.ticketflow.backend.dto.EventRequestDto;
import com.ticketflow.backend.dto.EventResponseDto;
import com.ticketflow.backend.entity.Event;
import com.ticketflow.backend.exception.ResourceNotFoundException;
import com.ticketflow.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

// @Service: marca esta classe como um bean Spring gerenciado (criado e injetado automaticamente).
// @RequiredArgsConstructor (Lombok): gera um construtor para todos os campos 'final',
//   permitindo que o Spring injete EventRepository via construtor (injeção preferida sobre @Autowired).
// @Transactional: cada método public roda dentro de uma transação do banco.
//   Se uma exceção ocorrer, tudo é revertido (rollback) automaticamente.
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EventService {

    private final EventRepository eventRepository;

    @Transactional(readOnly = true)
    public List<EventResponseDto> findAll() {
        log.debug("Buscando todos os eventos");
        return eventRepository.findAllByOrderByDateAsc()
                .stream()
                .map(this::toResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventResponseDto findById(UUID id) {
        log.debug("Buscando evento com id={}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento não encontrado com id: " + id));
        return toResponseDto(event);
    }

    public EventResponseDto create(EventRequestDto dto) {
        log.debug("Criando evento: name={}", dto.name());
        Event event = new Event();
        event.setName(dto.name());
        event.setDescription(dto.description());
        event.setDate(dto.date());
        event.setLocation(dto.location());
        Event saved = eventRepository.save(event);
        log.info("Evento criado: id={}, name={}", saved.getId(), saved.getName());
        return toResponseDto(saved);
    }

    public EventResponseDto update(UUID id, EventRequestDto dto) {
        log.debug("Atualizando evento id={}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento não encontrado com id: " + id));
        event.setName(dto.name());
        event.setDescription(dto.description());
        event.setDate(dto.date());
        event.setLocation(dto.location());
        return toResponseDto(eventRepository.save(event));
    }

    public void delete(UUID id) {
        log.debug("Removendo evento id={}", id);
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Evento não encontrado com id: " + id);
        }
        eventRepository.deleteById(id);
        log.info("Evento removido: id={}", id);
    }

    private EventResponseDto toResponseDto(Event event) {
        return new EventResponseDto(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getDate(),
                event.getLocation(),
                event.getCreatedAt()
        );
    }
}
