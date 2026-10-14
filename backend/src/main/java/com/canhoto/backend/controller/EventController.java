package com.canhoto.backend.controller;

import com.canhoto.backend.dto.EventRequestDto;
import com.canhoto.backend.dto.EventResponseDto;
import com.canhoto.backend.dto.PageResponseDto;
import com.canhoto.backend.entity.User;
import com.canhoto.backend.repository.UserRepository;
import com.canhoto.backend.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Gerenciamento de eventos")
public class EventController {

    private final EventService eventService;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Lista eventos paginados, com busca e filtros opcionais")
    public ResponseEntity<PageResponseDto<EventResponseDto>> findAll(
            @Parameter(description = "Busca em nome, local e descricao. Ignora acento e caixa.")
            @RequestParam(required = false) String q,

            @Parameter(description = "Somente eventos a partir desta data/hora")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime de,

            @Parameter(description = "Somente eventos ate esta data/hora")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime ate,

            @Parameter(description = "Esconde eventos totalmente esgotados")
            @RequestParam(defaultValue = "false") boolean comVagas,

            @PageableDefault(size = 12, sort = "date", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(eventService.findAll(q, de, ate, comVagas, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Busca um evento pelo ID")
    public ResponseEntity<EventResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(eventService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Cria um novo evento")
    public ResponseEntity<EventResponseDto> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody EventRequestDto dto) {
        EventResponseDto created = eventService.create(dto, resolveUser(userDetails));
        // HTTP 201 Created com o header Location apontando para o novo recurso (boa prática REST).
        URI location = URI.create("/api/events/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza um evento existente")
    public ResponseEntity<EventResponseDto> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody EventRequestDto dto) {
        return ResponseEntity.ok(eventService.update(id, dto, resolveUser(userDetails)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove um evento")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        eventService.delete(id, resolveUser(userDetails));
        return ResponseEntity.noContent().build(); // HTTP 204 No Content
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado no contexto de segurança"));
    }
}
