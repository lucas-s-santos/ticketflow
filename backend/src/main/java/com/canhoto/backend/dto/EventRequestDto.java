package com.canhoto.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

public record EventRequestDto(
        @NotBlank(message = "O nome é obrigatório") String name,
        String description,
        @NotNull(message = "A data é obrigatória")
        @Future(message = "A data do evento deve estar no futuro")
        OffsetDateTime date,
        @NotBlank(message = "O local é obrigatório") String location,
        // Opcional. O Pattern aceita vazio para nao obrigar capa, mas barra
        // qualquer coisa que nao seja http(s) — inclusive javascript:, que
        // viraria XSS assim que a URL fosse parar num atributo src.
        @Size(max = 1000, message = "A URL da imagem é longa demais")
        @Pattern(regexp = "^$|^https?://.+", message = "A imagem deve ser uma URL http ou https")
        String coverImageUrl,
        // @Valid em lista: valida cada TicketSectorRequestDto individualmente.
        // A lista pode ser nula ou vazia (evento sem setores é permitido na criação).
        @Valid List<TicketSectorRequestDto> sectors
) {
}
