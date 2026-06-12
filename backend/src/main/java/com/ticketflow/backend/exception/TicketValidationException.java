package com.ticketflow.backend.exception;

// Lançada quando o token de um ingresso é inválido (assinatura não confere ou formato errado).
// Tratada dentro do TicketValidationService, que a converte em um resultado valid=false.
public class TicketValidationException extends RuntimeException {

    public TicketValidationException(String message) {
        super(message);
    }
}
