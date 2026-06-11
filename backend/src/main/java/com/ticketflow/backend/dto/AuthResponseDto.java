package com.ticketflow.backend.dto;

// Resposta retornada após login ou registro bem-sucedido.
// O frontend armazena o token no localStorage e o envia em cada requisição protegida.
public record AuthResponseDto(
        String token,
        String type,   // sempre "Bearer"
        String name,
        String email,
        String role,
        long expiresIn // milissegundos até expirar (para o frontend calcular quando renovar)
) {
}
