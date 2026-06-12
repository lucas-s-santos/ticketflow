package com.ticketflow.backend.dto;

import java.time.OffsetDateTime;

// Resultado da validação de um ingresso na portaria.
// reason ∈ {OK, INVALID_SIGNATURE, NOT_FOUND, NOT_CONFIRMED, NOT_OWNER, ALREADY_USED}
public record TicketValidationResultDto(
        boolean valid,
        String reason,
        String eventName,
        String sectorName,
        String holderName,
        Integer quantity,
        OffsetDateTime checkedInAt
) {
    public static TicketValidationResultDto invalid(String reason) {
        return new TicketValidationResultDto(false, reason, null, null, null, null, null);
    }
}
