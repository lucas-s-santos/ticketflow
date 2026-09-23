package com.canhoto.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record TicketValidationRequestDto(
        @NotBlank String token
) {}
