package com.ticketflow.backend.controller;

import com.ticketflow.backend.dto.EventRequestDto;
import com.ticketflow.backend.dto.EventResponseDto;
import com.ticketflow.backend.entity.User;
import com.ticketflow.backend.repository.UserRepository;
import com.ticketflow.backend.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

// @RestController = @Controller + @ResponseBody: todos os métodos retornam JSON automaticamente.
// @RequestMapping("/api/events"): prefixo base de todas as rotas deste controller.
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Gerenciamento de eventos")
public class EventController {

    private final EventService eventService;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Lista todos os eventos ordenados por data")
    public ResponseEntity<List<EventResponseDto>> findAll() {
        return ResponseEntity.ok(eventService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Busca um evento pelo ID")
    public ResponseEntity<EventResponseDto> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(eventService.findById(id));
    }

    // @Valid: aciona as validações do EventRequestDto (@NotBlank, @NotNull).
    // Se falhar, o GlobalExceptionHandler intercepta antes de chegar ao service.
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
