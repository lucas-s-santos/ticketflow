package com.ticketflow.backend.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EventStatsDto(
        UUID eventId,
        String eventName,
        OffsetDateTime date,
        int totalCapacity,
        int totalSold,
        BigDecimal revenue,
        List<SectorStatsDto> sectors
) {}
