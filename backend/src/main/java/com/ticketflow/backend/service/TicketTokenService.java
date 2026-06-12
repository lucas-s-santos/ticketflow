package com.ticketflow.backend.service;

import com.ticketflow.backend.exception.TicketValidationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;

// Gera e valida o token do ingresso (o conteúdo do QR code).
// Formato: base64url(reservationId) + "." + hmacHex(reservationId)
// O token é recomputável a partir do reservationId — não precisa ser guardado no banco.
// Usa um segredo próprio (app.ticket.secret), separado do segredo de webhook.
@Service
public class TicketTokenService {

    private static final String ALGORITHM = "HmacSHA256";
    private final byte[] secretBytes;

    public TicketTokenService(@Value("${app.ticket.secret}") String secret) {
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String generate(UUID reservationId) {
        String id = reservationId.toString();
        String encodedId = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(id.getBytes(StandardCharsets.UTF_8));
        return encodedId + "." + sign(id);
    }

    // Valida a assinatura e devolve o reservationId. Lança se o token for forjado/adulterado.
    public UUID verifyAndExtract(String token) {
        if (token == null || !token.contains(".")) {
            throw new TicketValidationException("Token de ingresso malformado");
        }
        String[] parts = token.split("\\.", 2);
        String id;
        try {
            id = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw new TicketValidationException("Token de ingresso malformado");
        }

        String expected = sign(id);
        // Comparação em tempo constante: não revela onde os bytes diferem (anti-timing).
        boolean ok = MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                parts[1].getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            throw new TicketValidationException("Assinatura do ingresso inválida");
        }
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            throw new TicketValidationException("Token de ingresso malformado");
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secretBytes, ALGORITHM));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao assinar token de ingresso", e);
        }
    }
}
