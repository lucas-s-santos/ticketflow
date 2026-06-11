package com.ticketflow.backend.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record TicketSectorResponseDto(
        UUID id,
        String name,
        int capacity,
        int availableSeats,
        BigDecimal price
) {
}
