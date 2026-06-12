package com.ticketflow.backend.dto;

import java.util.UUID;

// Corpo do webhook que o gateway simulado entrega ao TicketFlow.
// decision ∈ {"APPROVED", "DECLINED"}.
public record PaymentWebhookPayload(UUID paymentId, String decision) {}
