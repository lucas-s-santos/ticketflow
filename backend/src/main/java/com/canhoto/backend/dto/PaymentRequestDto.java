package com.canhoto.backend.dto;

import com.canhoto.backend.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PaymentRequestDto(
        @NotNull UUID reservationId,
        @NotNull PaymentMethod method
) {}
