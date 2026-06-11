package com.ticketflow.backend.exception;

// RuntimeException não exige declaração em assinaturas de método (unchecked).
// Lançada quando um recurso buscado por ID não existe no banco.
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
