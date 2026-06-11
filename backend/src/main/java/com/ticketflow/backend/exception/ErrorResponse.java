package com.ticketflow.backend.exception;

// Formato padronizado de erro para TODAS as respostas de erro da API.
// Ex.: { "code": "NOT_FOUND", "message": "Event not found with id: ..." }
public record ErrorResponse(String code, String message) {
}
