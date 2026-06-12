package com.ticketflow.backend.exception;

// Lançada quando a assinatura HMAC de um webhook não confere —
// indica requisição forjada ou adulterada. Resulta em 401.
public class WebhookVerificationException extends RuntimeException {

    public WebhookVerificationException(String message) {
        super(message);
    }
}
