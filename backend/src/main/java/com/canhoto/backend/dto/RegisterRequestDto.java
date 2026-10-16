package com.canhoto.backend.dto;

import com.canhoto.backend.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Tetos de tamanho: sem eles, um nome de 10 mil caracteres chegava ao banco
// (VARCHAR 255) e voltava como 500. A senha para em 72 porque o BCrypt so
// considera os primeiros 72 bytes — o resto seria ignorado sem aviso.
public record RegisterRequestDto(
        @NotBlank(message = "O nome é obrigatório") @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres") String name,
        @Email(message = "Email inválido") @NotBlank(message = "O email é obrigatório") @Size(max = 254, message = "Email longo demais") String email,
        @NotBlank(message = "A senha é obrigatória") @Size(min = 6, max = 72, message = "A senha deve ter entre 6 e 72 caracteres") String password,
        @NotNull(message = "O papel é obrigatório") Role role
) {
}
