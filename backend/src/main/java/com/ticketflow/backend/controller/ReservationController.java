package com.ticketflow.backend.controller;

import com.ticketflow.backend.dto.ReservationRequestDto;
import com.ticketflow.backend.dto.ReservationResponseDto;
import com.ticketflow.backend.entity.User;
import com.ticketflow.backend.repository.UserRepository;
import com.ticketflow.backend.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;
    private final UserRepository userRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponseDto create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ReservationRequestDto dto) {
        User user = resolveUser(userDetails);
        return reservationService.reserve(user.getId(), dto);
    }

    @GetMapping("/me")
    public List<ReservationResponseDto> listMine(@AuthenticationPrincipal UserDetails userDetails) {
        User user = resolveUser(userDetails);
        return reservationService.findByUser(user.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable java.util.UUID id) {
        User user = resolveUser(userDetails);
        reservationService.cancel(id, user.getId());
    }

    // @AuthenticationPrincipal retorna o UserDetails populado pelo JwtAuthenticationFilter.
    // Como nosso User implementa UserDetails, o getUsername() retorna o email.
    private User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado no contexto de segurança"));
    }
}
