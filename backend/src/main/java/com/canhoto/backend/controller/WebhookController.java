package com.canhoto.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.canhoto.backend.dto.PaymentWebhookPayload;
import com.canhoto.backend.exception.WebhookVerificationException;
import com.canhoto.backend.service.WebhookService;
import com.canhoto.backend.service.WebhookSignatureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookSignatureService signatureService;
    private final WebhookService webhookService;
    private final ObjectMapper objectMapper;

    // Recebe o corpo CRU (String), não um objeto desserializado: o HMAC precisa ser
    // verificado sobre exatamente os bytes recebidos. Desserializar antes mudaria o conteúdo
    // (espaços, ordem de campos) e quebraria a verificação.
    @PostMapping("/payments")
    public void receivePaymentWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Signature", required = false) String signature) {

        if (!signatureService.verify(rawBody, signature)) {
            log.warn("Webhook rejeitado: assinatura HMAC inválida");
            throw new WebhookVerificationException("Assinatura do webhook inválida");
        }

        PaymentWebhookPayload payload;
        try {
            payload = objectMapper.readValue(rawBody, PaymentWebhookPayload.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Payload de webhook inválido");
        }
        webhookService.process(payload);
    }
}
