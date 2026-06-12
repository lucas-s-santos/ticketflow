package com.ticketflow.backend;

import com.ticketflow.backend.exception.TicketValidationException;
import com.ticketflow.backend.service.TicketTokenService;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Teste unitário puro (sem Spring): valida a geração/verificação do token de ingresso.
class TicketTokenServiceTest {

    private final TicketTokenService service =
            new TicketTokenService("segredo-de-teste-ingresso");

    @Test
    void token_gerado_e_verificado_devolve_o_mesmo_id() {
        UUID reservationId = UUID.randomUUID();
        String token = service.generate(reservationId);

        assertThat(service.verifyAndExtract(token))
                .as("token íntegro deve devolver o reservationId original")
                .isEqualTo(reservationId);
    }

    @Test
    void token_adulterado_falha() {
        UUID reservationId = UUID.randomUUID();
        String token = service.generate(reservationId);

        // Troca o último caractere da assinatura
        String tampered = token.substring(0, token.length() - 1) +
                (token.endsWith("a") ? "b" : "a");

        assertThatThrownBy(() -> service.verifyAndExtract(tampered))
                .isInstanceOf(TicketValidationException.class);
    }

    @Test
    void token_de_outro_segredo_falha() {
        TicketTokenService outroEmissor = new TicketTokenService("segredo-diferente");
        String token = outroEmissor.generate(UUID.randomUUID());

        assertThatThrownBy(() -> service.verifyAndExtract(token))
                .as("token assinado com outro segredo não pode validar")
                .isInstanceOf(TicketValidationException.class);
    }

    @Test
    void token_malformado_falha() {
        assertThatThrownBy(() -> service.verifyAndExtract("sem-ponto-nem-assinatura"))
                .isInstanceOf(TicketValidationException.class);
    }
}
