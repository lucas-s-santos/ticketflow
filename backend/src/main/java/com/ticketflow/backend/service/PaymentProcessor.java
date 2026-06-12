package com.ticketflow.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketflow.backend.config.RabbitMQConfig;
import com.ticketflow.backend.dto.PaymentMessage;
import com.ticketflow.backend.dto.PaymentWebhookPayload;
import com.ticketflow.backend.entity.Payment;
import com.ticketflow.backend.entity.PaymentStatus;
import com.ticketflow.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.concurrent.ThreadLocalRandom;

// Consumidor do RabbitMQ: simula o gateway de pagamento.
// Na Fase 5 ele NÃO grava mais no banco — apenas decide o resultado e entrega
// um webhook assinado ao TicketFlow (como Stripe/Mercado Pago fazem com sistemas reais).
// Se a entrega falhar, a exceção propaga e aciona retry → DLQ.
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentProcessor {

    private final PaymentRepository paymentRepository;
    private final WebhookSignatureService signatureService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${app.payment.failure-rate}")
    private double failureRate;

    @Value("${app.payment.processing-delay-ms}")
    private long processingDelayMs;

    @Value("${app.webhook.url}")
    private String webhookUrl;

    // readOnly: este método apenas LÊ o pagamento para decidir. A gravação acontece
    // depois, no WebhookService, quando o webhook é recebido e verificado.
    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    @Transactional(readOnly = true)
    public void process(PaymentMessage message) {
        Payment payment = paymentRepository.findById(message.paymentId()).orElse(null);
        if (payment == null) {
            log.warn("Pagamento {} não encontrado — mensagem ignorada", message.paymentId());
            return;
        }
        // Proteção contra reprocessamento de mensagem duplicada
        if (payment.getStatus() != PaymentStatus.PROCESSING) {
            log.info("Pagamento {} já está {} — ignorando", payment.getId(), payment.getStatus());
            return;
        }

        simulateGatewayLatency();

        // failure-rate = 0.0 → sempre aprova. nextDouble() ∈ [0,1); >= 0.0 é sempre verdadeiro.
        boolean approved = ThreadLocalRandom.current().nextDouble() >= failureRate;
        String decision = approved ? "APPROVED" : "DECLINED";

        deliverWebhook(new PaymentWebhookPayload(payment.getId(), decision));
        log.info("Gateway decidiu {} para pagamento {} — webhook entregue", decision, payment.getId());
    }

    // Entrega o webhook assinado. Qualquer falha (conexão recusada, 4xx/5xx) propaga a exceção,
    // que aciona o mecanismo de retry do Spring AMQP e, esgotado, manda a mensagem para a DLQ.
    private void deliverWebhook(PaymentWebhookPayload payload) {
        String body;
        try {
            body = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao serializar payload do webhook", e);
        }
        String signature = signatureService.sign(body);

        restClient.post()
                .uri(webhookUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Signature", signature)
                .body(body)
                .retrieve()
                .toBodilessEntity();   // lança em status 4xx/5xx → aciona retry/DLQ
    }

    private void simulateGatewayLatency() {
        if (processingDelayMs <= 0) {
            return;
        }
        try {
            Thread.sleep(processingDelayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
