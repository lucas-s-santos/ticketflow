package com.ticketflow.backend.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

// DTO de resposta: inclui id e createdAt (que o cliente nunca envia, mas sempre recebe).
// Separar Request e Response evita que anotações de validação do request
// afetem acidentalmente a serialização da resposta.
public record EventResponseDto(
        UUID id,
        String name,
        String description,
        OffsetDateTime date,
        String location,
        OffsetDateTime createdAt
) {
}
