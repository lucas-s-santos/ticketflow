package com.canhoto.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// O limite de 10 também é checado no ReservationService (MAX_TICKET_QUANTITY).
// Aqui ele barra a requisição antes de tocar no banco; lá ele garante que a regra
// vale mesmo para quem chamar o service por fora do controller.
public record ReservationRequestDto(
        @NotNull UUID ticketSectorId,
        @NotNull
        @Min(value = 1, message = "A quantidade mínima é 1 ingresso")
        @Max(value = 10, message = "A quantidade máxima é 10 ingressos por reserva")
        Integer quantity
) {}
