package com.canhoto.backend;

import com.canhoto.backend.security.LoginRateLimiter;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Teste unitário puro: valida o token bucket sem subir contexto Spring. */
class LoginRateLimiterTest {

    @Test
    void libera_ate_o_teto_e_recusa_a_seguinte() {
        LoginRateLimiter limiter = new LoginRateLimiter(3, 60);

        assertThat(limiter.permitir("10.0.0.1")).isTrue();
        assertThat(limiter.permitir("10.0.0.1")).isTrue();
        assertThat(limiter.permitir("10.0.0.1")).isTrue();

        assertThat(limiter.permitir("10.0.0.1"))
                .as("a quarta tentativa estoura o teto de 3")
                .isFalse();
    }

    @Test
    void cada_origem_tem_seu_proprio_saldo() {
        LoginRateLimiter limiter = new LoginRateLimiter(1, 60);

        assertThat(limiter.permitir("10.0.0.1")).isTrue();
        assertThat(limiter.permitir("10.0.0.1")).isFalse();

        assertThat(limiter.permitir("10.0.0.2"))
                .as("bloquear um IP nao pode bloquear os outros")
                .isTrue();
    }

    @Test
    void login_bem_sucedido_devolve_o_saldo() {
        LoginRateLimiter limiter = new LoginRateLimiter(2, 60);

        limiter.permitir("10.0.0.1");
        limiter.permitir("10.0.0.1");
        assertThat(limiter.permitir("10.0.0.1")).isFalse();

        limiter.liberar("10.0.0.1");

        assertThat(limiter.permitir("10.0.0.1"))
                .as("quem acertou a senha nao deve seguir perto do bloqueio")
                .isTrue();
    }

    @Test
    void recarrega_com_o_passar_do_tempo() throws InterruptedException {
        // Janela de 1s para 10 tentativas: cada 100ms repoe um token.
        LoginRateLimiter limiter = new LoginRateLimiter(10, 1);

        for (int i = 0; i < 10; i++) {
            assertThat(limiter.permitir("10.0.0.1")).isTrue();
        }
        assertThat(limiter.permitir("10.0.0.1")).isFalse();

        Thread.sleep(250);

        assertThat(limiter.permitir("10.0.0.1"))
                .as("apos 250ms a recarga preguicosa ja repos pelo menos um token")
                .isTrue();
    }
}
