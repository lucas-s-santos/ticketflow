package com.ticketflow.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
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

    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponse handleBadCredentials(BadCredentialsException ex) {
        return new ErrorResponse("INVALID_CREDENTIALS", "Email ou senha inválidos");
    }

    // AccessDeniedException lançada DENTRO de um service (ex.: pagar/cancelar reserva alheia)
    // chega aqui pelo @RestControllerAdvice. Sem este handler, cairia no genérico → 500.
    // (Negações no nível do filtro do Spring Security são tratadas pelo accessDeniedHandler da SecurityConfig.)
    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleAccessDenied(AccessDeniedException ex) {
        return new ErrorResponse("FORBIDDEN", "Acesso negado");
    }

    // Assinatura HMAC do webhook não confere — requisição forjada ou adulterada.
    @ExceptionHandler(WebhookVerificationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponse handleWebhookVerification(WebhookVerificationException ex) {
        return new ErrorResponse("INVALID_SIGNATURE", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleConflict(IllegalArgumentException ex) {
        return new ErrorResponse("CONFLICT", ex.getMessage());
    }

    // IllegalStateException: usado para violar regras de negócio como assentos insuficientes
    // ou tentar cancelar uma reserva que não está PENDING.
    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleIllegalState(IllegalStateException ex) {
        return new ErrorResponse("BUSINESS_RULE_VIOLATION", ex.getMessage());
    }

    // Acionado quando um header obrigatório (ex.: Idempotency-Key no checkout) não é enviado.
    @ExceptionHandler(MissingRequestHeaderException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleMissingHeader(MissingRequestHeaderException ex) {
        return new ErrorResponse("MISSING_HEADER", "Header obrigatório ausente: " + ex.getHeaderName());
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
