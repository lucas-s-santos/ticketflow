package com.ticketflow.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReservationRequestDto(
        @NotNull UUID ticketSectorId,
        @NotNull @Min(1) Integer quantity
) {}
