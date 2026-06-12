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
        OffsetDateTime createdAt,
        // Token do ingresso (conteúdo do QR), preenchido apenas quando CONFIRMED.
        String ticketToken,
        // Momento do check-in na portaria; null = ingresso ainda não usado.
        OffsetDateTime checkedInAt
) {}
