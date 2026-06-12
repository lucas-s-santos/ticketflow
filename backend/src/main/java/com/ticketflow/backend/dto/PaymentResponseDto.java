package com.ticketflow.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponseDto(
        UUID id,
        UUID reservationId,
        BigDecimal amount,
        String method,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
