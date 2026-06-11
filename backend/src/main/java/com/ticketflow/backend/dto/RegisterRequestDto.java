package com.ticketflow.backend.dto;

import com.ticketflow.backend.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequestDto(
        @NotBlank(message = "O nome é obrigatório") String name,
        @Email(message = "Email inválido") @NotBlank(message = "O email é obrigatório") String email,
        @NotBlank(message = "A senha é obrigatória") @Size(min = 6, message = "A senha deve ter pelo menos 6 caracteres") String password,
        @NotNull(message = "O papel é obrigatório") Role role
) {
}
