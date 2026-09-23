package com.canhoto.backend.exception;

// Regra de negócio violada: a requisição é sintaticamente válida, mas o estado atual
// do sistema não permite a operação (ex.: remover setor que já tem reservas).
// Mapeada para HTTP 409 Conflict pelo GlobalExceptionHandler.
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
