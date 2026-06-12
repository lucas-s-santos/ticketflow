package com.ticketflow.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record OrganizerDashboardDto(
        long totalEvents,
        long totalTicketsSold,
        BigDecimal totalRevenue,
        List<EventStatsDto> events
) {}
