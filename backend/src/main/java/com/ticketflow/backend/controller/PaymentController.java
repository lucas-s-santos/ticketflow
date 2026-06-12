package com.ticketflow.backend.controller;

import com.ticketflow.backend.dto.PaymentRequestDto;
import com.ticketflow.backend.dto.PaymentResponseDto;
import com.ticketflow.backend.entity.User;
import com.ticketflow.backend.repository.UserRepository;
import com.ticketflow.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    // Idempotency-Key é um header obrigatório. O cliente gera um UUID e o reenvia
    // se precisar repetir a requisição — garantindo que o mesmo checkout não cobre duas vezes.
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponseDto checkout(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody PaymentRequestDto dto) {
        User user = resolveUser(userDetails);
        return paymentService.checkout(user.getId(), dto, idempotencyKey);
    }

    @GetMapping("/{id}")
    public PaymentResponseDto getById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        User user = resolveUser(userDetails);
        return paymentService.findById(id, user.getId());
    }

    private User resolveUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado no contexto de segurança"));
    }
}
