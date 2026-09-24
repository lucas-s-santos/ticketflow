package com.canhoto.backend.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Garante que a rede de proteção contra segredo de desenvolvimento em produção
 * realmente pega cada caso.
 *
 * <p>Um teste aqui vale mais do que o normal: a falha que ele previne é
 * silenciosa. Sem esta checagem, um deploy incompleto sobe verde, atende
 * requisições e só revela o problema quando alguém forja um ingresso.
 */
class ValidacaoDeSegredosTest {

    // Valores que um deploy de verdade usaria.
    private static final String JWT_BOM = "kZ8Qw1nL4yV7bT2xR5cF9eH3jM6pS0aD8gK1uY4wZ7Q=";
    private static final String WEBHOOK_BOM = "hmac-de-webhook-de-producao-9f2a";
    private static final String INGRESSO_BOM = "hmac-de-ingresso-de-producao-3c7b";
    private static final String SENHA_BOA = "senha-forte-do-neon";
    private static final String ORIGEM_BOA = "https://canhoto.vercel.app";

    private List<String> validar(String jwt, String webhook, String ingresso, String senha, String origem) {
        return ValidacaoDeSegredos.problemasEncontrados(jwt, webhook, ingresso, senha, origem);
    }

    @Test
    void configuracao_completa_nao_acusa_nada() {
        assertThat(validar(JWT_BOM, WEBHOOK_BOM, INGRESSO_BOM, SENHA_BOA, ORIGEM_BOA))
                .isEmpty();
    }

    @Test
    void acusa_a_chave_jwt_de_desenvolvimento() {
        assertThat(validar(ValidacaoDeSegredos.JWT_PADRAO, WEBHOOK_BOM, INGRESSO_BOM, SENHA_BOA, ORIGEM_BOA))
                .singleElement().asString().contains("APP_SECURITY_JWT_SECRET_KEY");
    }

    @Test
    void acusa_o_segredo_do_ingresso() {
        // O mais grave da lista: com ele qualquer um assina um ingresso valido.
        assertThat(validar(JWT_BOM, WEBHOOK_BOM, ValidacaoDeSegredos.INGRESSO_PADRAO, SENHA_BOA, ORIGEM_BOA))
                .singleElement().asString().contains("APP_TICKET_SECRET");
    }

    @Test
    void acusa_o_segredo_do_webhook() {
        assertThat(validar(JWT_BOM, ValidacaoDeSegredos.WEBHOOK_PADRAO, INGRESSO_BOM, SENHA_BOA, ORIGEM_BOA))
                .singleElement().asString().contains("APP_WEBHOOK_SECRET");
    }

    @Test
    void acusa_a_senha_do_docker_compose() {
        assertThat(validar(JWT_BOM, WEBHOOK_BOM, INGRESSO_BOM, ValidacaoDeSegredos.SENHA_BANCO_PADRAO, ORIGEM_BOA))
                .singleElement().asString().contains("SPRING_DATASOURCE_PASSWORD");
    }

    @Test
    void acusa_cors_apontando_para_localhost() {
        assertThat(validar(JWT_BOM, WEBHOOK_BOM, INGRESSO_BOM, SENHA_BOA, "http://localhost:4200"))
                .singleElement().asString().contains("APP_CORS_ALLOWED_ORIGINS");
    }

    @Test
    void acusa_chave_jwt_curta_demais() {
        // Trocar pelo proprio valor nao basta: uma chave de 128 bits passaria
        // pela comparacao com o padrao e mesmo assim enfraqueceria o HS256.
        String curta = java.util.Base64.getEncoder().encodeToString(new byte[16]); // 128 bits

        assertThat(validar(curta, WEBHOOK_BOM, INGRESSO_BOM, SENHA_BOA, ORIGEM_BOA))
                .singleElement().asString()
                .contains("128 bits")
                .contains("256");
    }

    @Test
    void lista_todos_os_problemas_de_uma_vez() {
        // Reportar um por vez faria o deploy falhar cinco vezes seguidas.
        assertThat(validar(
                ValidacaoDeSegredos.JWT_PADRAO,
                ValidacaoDeSegredos.WEBHOOK_PADRAO,
                ValidacaoDeSegredos.INGRESSO_PADRAO,
                ValidacaoDeSegredos.SENHA_BANCO_PADRAO,
                "http://localhost:4200"))
                .hasSize(5);
    }
}
