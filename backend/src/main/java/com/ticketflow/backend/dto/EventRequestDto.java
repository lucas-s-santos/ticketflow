package com.ticketflow.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.List;

public record EventRequestDto(
        @NotBlank(message = "O nome é obrigatório") String name,
        String description,
        @NotNull(message = "A data é obrigatória") OffsetDateTime date,
        @NotBlank(message = "O local é obrigatório") String location,
        // @Valid em lista: valida cada TicketSectorRequestDto individualmente.
        // A lista pode ser nula ou vazia (evento sem setores é permitido na criação).
        @Valid List<TicketSectorRequestDto> sectors
) {
}
