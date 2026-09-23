package com.canhoto.backend.controller;

import com.canhoto.backend.dto.PaymentRequestDto;
import com.canhoto.backend.dto.PaymentResponseDto;
import com.canhoto.backend.entity.User;
import com.canhoto.backend.repository.UserRepository;
import com.canhoto.backend.service.PaymentService;
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
