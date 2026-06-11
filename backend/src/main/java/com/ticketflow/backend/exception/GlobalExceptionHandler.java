package com.ticketflow.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

// @RestControllerAdvice: intercepta exceções lançadas em QUALQUER @RestController.
// Sem isso, o Spring retornaria stack traces expostos ou páginas HTML de erro — ambos ruins.
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage());
    }

    // Acionado quando @Valid falha em um @RequestBody.
    // Coleta todos os erros de campo e os junta em uma mensagem legível.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        return new ErrorResponse("VALIDATION_FAILED", message);
    }

    // Captura qualquer exceção não tratada explicitamente.
    // Loga o erro completo no servidor mas NUNCA expõe stack trace para o cliente.
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneric(Exception ex) {
        log.error("Exceção não tratada", ex);
        return new ErrorResponse("INTERNAL_ERROR", "Ocorreu um erro inesperado");
    }
}
