package com.ticketflow.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

// Assina e verifica payloads de webhook com HMAC-SHA256.
// HMAC prova que a mensagem veio de quem conhece o segredo compartilhado e não foi adulterada.
@Service
public class WebhookSignatureService {

    private static final String ALGORITHM = "HmacSHA256";
    private final byte[] secretBytes;

    public WebhookSignatureService(@Value("${app.webhook.secret}") String secret) {
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
    }

    // Gera a assinatura hexadecimal do payload.
    public String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secretBytes, ALGORITHM));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return toHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao gerar assinatura HMAC", e);
        }
    }

    // Recalcula a assinatura e compara com a recebida.
    // MessageDigest.isEqual compara em tempo constante — não revela onde os bytes diferem,
    // evitando ataques de timing que adivinhariam a assinatura caractere a caractere.
    public boolean verify(String payload, String signature) {
        if (signature == null || signature.isBlank()) {
            return false;
        }
        String expected = sign(payload);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8));
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
