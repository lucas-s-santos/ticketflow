package com.ticketflow.backend.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EventResponseDto(
        UUID id,
        String name,
        String description,
        OffsetDateTime date,
        String location,
        OffsetDateTime createdAt,
        List<TicketSectorResponseDto> sectors
) {
}
