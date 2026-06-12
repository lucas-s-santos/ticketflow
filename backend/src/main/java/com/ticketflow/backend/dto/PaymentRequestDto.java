package com.ticketflow.backend.dto;

import com.ticketflow.backend.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PaymentRequestDto(
        @NotNull UUID reservationId,
        @NotNull PaymentMethod method
) {}
