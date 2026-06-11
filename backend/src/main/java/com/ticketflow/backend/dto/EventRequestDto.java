package com.ticketflow.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

// Java record: imutável, com equals/hashCode/toString automáticos. Perfeito para DTOs.
// @NotBlank e @NotNull são acionados pelo @Valid no controller — o Spring rejeita a requisição
// antes mesmo de chegar ao service se alguma validação falhar.
public record EventRequestDto(
        @NotBlank(message = "O nome é obrigatório") String name,
        String description,
        @NotNull(message = "A data é obrigatória") OffsetDateTime date,
        @NotBlank(message = "O local é obrigatório") String location
) {
}
