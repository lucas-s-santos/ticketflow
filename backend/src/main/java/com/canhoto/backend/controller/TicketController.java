package com.canhoto.backend.controller;

import com.canhoto.backend.dto.TicketValidationRequestDto;
import com.canhoto.backend.dto.TicketValidationResultDto;
import com.canhoto.backend.entity.User;
import com.canhoto.backend.repository.UserRepository;
import com.canhoto.backend.service.TicketValidationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketValidationService ticketValidationService;
    private final UserRepository userRepository;

    // Valida e faz check-in de um ingresso. Apenas organizadores (restrito na SecurityConfig).
    @PostMapping("/validate")
    public TicketValidationResultDto validate(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody TicketValidationRequestDto dto) {
        User organizer = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado no contexto de segurança"));
        return ticketValidationService.validate(dto.token(), organizer.getId());
    }
}
