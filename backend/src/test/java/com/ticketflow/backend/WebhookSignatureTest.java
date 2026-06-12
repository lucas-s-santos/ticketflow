package com.ticketflow.backend;

import com.ticketflow.backend.service.WebhookSignatureService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

// Teste unitário puro (sem Spring): verifica a lógica de assinatura HMAC isoladamente.
class WebhookSignatureTest {

    private final WebhookSignatureService service =
            new WebhookSignatureService("segredo-de-teste-hmac");

    @Test
    void assinatura_valida_e_verificada() {
        String payload = "{\"paymentId\":\"abc\",\"decision\":\"APPROVED\"}";
        String signature = service.sign(payload);

        assertThat(service.verify(payload, signature))
                .as("assinatura gerada pelo próprio serviço deve ser válida")
                .isTrue();
    }

    @Test
    void payload_adulterado_falha_na_verificacao() {
        String payload = "{\"paymentId\":\"abc\",\"decision\":\"APPROVED\"}";
        String signature = service.sign(payload);

        String tampered = "{\"paymentId\":\"abc\",\"decision\":\"DECLINED\"}";
        assertThat(service.verify(tampered, signature))
                .as("payload alterado não pode validar com a assinatura original")
                .isFalse();
    }

    @Test
    void assinatura_ausente_ou_errada_falha() {
        String payload = "{\"paymentId\":\"abc\",\"decision\":\"APPROVED\"}";

        assertThat(service.verify(payload, null)).isFalse();
        assertThat(service.verify(payload, "")).isFalse();
        assertThat(service.verify(payload, "deadbeef")).isFalse();
    }
}
