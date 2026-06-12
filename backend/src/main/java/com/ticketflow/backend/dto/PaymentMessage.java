package com.ticketflow.backend.dto;

import java.util.UUID;

// Corpo da mensagem publicada na fila. Carrega apenas o ID do pagamento —
// o consumidor recarrega a entidade completa do banco (evita dados obsoletos na fila).
public record PaymentMessage(UUID paymentId) {}
