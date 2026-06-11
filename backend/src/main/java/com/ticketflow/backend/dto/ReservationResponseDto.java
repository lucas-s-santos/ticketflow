package com.ticketflow.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ReservationResponseDto(
        UUID id,
        UUID ticketSectorId,
        String sectorName,
        String eventName,
        Integer quantity,
        BigDecimal totalPrice,
        String status,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt
) {}
