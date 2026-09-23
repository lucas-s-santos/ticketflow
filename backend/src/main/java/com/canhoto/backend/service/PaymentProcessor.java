package com.canhoto.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.canhoto.backend.config.RabbitMQConfig;
import com.canhoto.backend.dto.PaymentMessage;
import com.canhoto.backend.dto.PaymentWebhookPayload;
import com.canhoto.backend.entity.Payment;
import com.canhoto.backend.entity.PaymentStatus;
import com.canhoto.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.concurrent.ThreadLocalRandom;

// Consumidor do RabbitMQ: simula o gateway de pagamento.
// Na Fase 5 ele NÃO grava mais no banco — apenas decide o resultado e entrega
// um webhook assinado ao Canhoto (como Stripe/Mercado Pago fazem com sistemas reais).
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

    // SEM @Transactional de propósito. A leitura do pagamento roda na transação curta que
    // o próprio Spring Data abre em findById e termina ali; depois disso trabalhamos com uma
    // entidade destacada. Se o método fosse transacional, a conexão do pool ficaria presa
    // durante o sleep do gateway e a chamada HTTP do webhook — segundos de conexão ociosa por
    // mensagem, o que esgota o pool sob carga (e o plano free do Postgres dá poucas conexões).
    // Só tocamos em getId()/getStatus(), colunas simples, então não há lazy loading fora da sessão.
    @RabbitListener(queues = RabbitMQConfig.QUEUE)
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
