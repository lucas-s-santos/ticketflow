package com.ticketflow.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record TicketSectorRequestDto(
        @NotBlank(message = "O nome do setor é obrigatório") String name,
        @NotNull(message = "A capacidade é obrigatória") @Positive(message = "A capacidade deve ser positiva") Integer capacity,
        @NotNull(message = "O preço é obrigatório") @DecimalMin(value = "0.01", message = "O preço deve ser maior que zero") BigDecimal price
) {
}
