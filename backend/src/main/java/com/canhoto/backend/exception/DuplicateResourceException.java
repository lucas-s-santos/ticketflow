package com.canhoto.backend.exception;

// Recurso único já existe (ex.: cadastro com email já usado).
// Mapeada para HTTP 409 Conflict pelo GlobalExceptionHandler.
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
