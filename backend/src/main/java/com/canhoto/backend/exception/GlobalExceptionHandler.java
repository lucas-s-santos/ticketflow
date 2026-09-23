package com.canhoto.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
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

// Ponto unico de traducao de excecao para resposta HTTP. Nenhum controller
// trata erro: se uma excecao nao tem handler aqui, ela vira 500 generico e
// o stack trace fica no log, nunca na resposta.
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

    // Regra de negócio violada: a requisição está bem formada, mas o estado atual do sistema
    // não permite a operação (assentos insuficientes, setor com reservas, reserva já paga...).
    @ExceptionHandler(BusinessRuleException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleBusinessRule(BusinessRuleException ex) {
        return new ErrorResponse("BUSINESS_RULE_VIOLATION", ex.getMessage());
    }

    // Recurso único duplicado (ex.: cadastro com email já existente).
    @ExceptionHandler(DuplicateResourceException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleDuplicate(DuplicateResourceException ex) {
        return new ErrorResponse("DUPLICATE_RESOURCE", ex.getMessage());
    }

    // Requisição malformada: argumento inválido que a validação declarativa não pegou
    // (ex.: corpo de webhook que não desserializa). 400, não 409.
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleIllegalArgument(IllegalArgumentException ex) {
        return new ErrorResponse("BAD_REQUEST", ex.getMessage());
    }

    // Rede de segurança: se alguma restrição do banco for violada apesar das checagens
    // de negócio (FK, UNIQUE), devolvemos 409 com mensagem estável em vez de 500.
    // O detalhe do Postgres fica no log do servidor, não na resposta.
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Violação de integridade no banco", ex);
        return new ErrorResponse("DATA_INTEGRITY_VIOLATION",
                "A operação conflita com dados existentes e não pôde ser concluída");
    }

    // Mantido como rede de segurança para IllegalStateException vinda de código de terceiros.
    // As regras de negócio do projeto usam BusinessRuleException.
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
