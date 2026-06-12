package com.ticketflow.backend.dto;

import java.math.BigDecimal;

public record SectorStatsDto(
        String sectorName,
        int capacity,
        int sold,        // ingressos confirmados (pagos)
        int available,   // assentos ainda disponíveis
        BigDecimal revenue
) {}
