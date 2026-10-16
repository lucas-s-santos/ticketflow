package com.canhoto.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequestDto(
        @Email(message = "Email inválido") @NotBlank(message = "O email é obrigatório") @Size(max = 254, message = "Email longo demais") String email,
        @NotBlank(message = "A senha é obrigatória") @Size(max = 72, message = "Senha longa demais") String password
) {
}
