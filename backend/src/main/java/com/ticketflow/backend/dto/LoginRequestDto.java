package com.ticketflow.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequestDto(
        @Email(message = "Email inválido") @NotBlank(message = "O email é obrigatório") String email,
        @NotBlank(message = "A senha é obrigatória") String password
) {
}
