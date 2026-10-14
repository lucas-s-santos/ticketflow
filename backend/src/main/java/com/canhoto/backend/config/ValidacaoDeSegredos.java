package com.canhoto.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * Recusa a subida em produção se algum segredo de desenvolvimento sobreviveu.
 *
 * <p>Os valores padrão vivem no {@code application.yml}, que é versionado — como
 * em qualquer projeto que precise rodar num clone novo sem configuração. O
 * problema não é isso; é o deploy que esquece de sobrescrever um deles. Nesse
 * caso o sistema sobe funcionando, sem nenhum sintoma, usando um segredo que
 * está publicado no GitHub.
 *
 * <p>O estrago varia conforme o segredo esquecido:
 * <ul>
 *   <li>{@code APP_TICKET_SECRET} — qualquer um forja um ingresso válido e entra
 *       no evento, porque o token é só um HMAC do id da reserva.</li>
 *   <li>{@code APP_SECURITY_JWT_SECRET_KEY} — qualquer um assina um token de
 *       sessão e se passa por organizador.</li>
 *   <li>{@code APP_WEBHOOK_SECRET} — qualquer um confirma pagamentos que nunca
 *       aconteceram, chamando o webhook com assinatura válida.</li>
 * </ul>
 *
 * <p>Falhar na subida é ruim; subir inseguro sem avisar é pior. Um deploy que
 * não sobe é visível em trinta segundos e se corrige preenchendo a variável.
 */
@Slf4j
@Configuration
@Profile("prod")
public class ValidacaoDeSegredos {

    /** Cópias dos padrões do application.yml. Se lá mudar, aqui precisa mudar junto. */
    static final String JWT_PADRAO = "6bRJZkTCjvyBU/NfKoRZU7pxsEc/kAfuVaTFccP+q9Q=";
    static final String WEBHOOK_PADRAO = "canhoto-webhook-hmac-secret-troque-em-producao";
    static final String INGRESSO_PADRAO = "canhoto-ticket-hmac-secret-troque-em-producao";
    static final String SENHA_BANCO_PADRAO = "canhoto_pass";

    /** HS256 exige no mínimo 256 bits de chave. */
    static final int BITS_MINIMOS_JWT = 256;

    @Value("${app.security.jwt.secret-key}")
    private String segredoJwt;

    @Value("${app.webhook.secret}")
    private String segredoWebhook;

    @Value("${app.ticket.secret}")
    private String segredoIngresso;

    @Value("${spring.datasource.password:}")
    private String senhaBanco;

    @Value("${app.cors.allowed-origins}")
    private String origensPermitidas;

    @PostConstruct
    void verificar() {
        List<String> problemas = problemasEncontrados(
                segredoJwt, segredoWebhook, segredoIngresso, senhaBanco, origensPermitidas);

        if (!problemas.isEmpty()) {
            String lista = problemas.stream()
                    .map(p -> "  - " + p + "\n")
                    .reduce("", String::concat);

            throw new IllegalStateException("""

                    A aplicação não subiu porque há segredos de desenvolvimento em produção.
                    Cada item abaixo é um valor que está publicado no repositório:

                    %s
                    Defina essas variáveis de ambiente no painel do provedor e suba de novo.
                    Referência: backend/.env.example
                    """.formatted(lista));
        }

        log.info("Segredos de produção conferidos: nenhum valor de desenvolvimento em uso.");
    }

    /**
     * A regra, separada da injeção do Spring para poder ser testada sem subir
     * contexto nenhum.
     *
     * @return a lista de problemas; vazia quando está tudo configurado.
     */
    static List<String> problemasEncontrados(
            String segredoJwt,
            String segredoWebhook,
            String segredoIngresso,
            String senhaBanco,
            String origensPermitidas) {

        List<String> problemas = new ArrayList<>();

        if (JWT_PADRAO.equals(segredoJwt)) {
            problemas.add("APP_SECURITY_JWT_SECRET_KEY ainda é o valor de desenvolvimento. "
                    + "Gere um novo: openssl rand -base64 32");
        } else {
            int bits = tamanhoEmBits(segredoJwt);
            if (bits < BITS_MINIMOS_JWT) {
                problemas.add("APP_SECURITY_JWT_SECRET_KEY tem %d bits; o HS256 exige %d."
                        .formatted(bits, BITS_MINIMOS_JWT));
            }
        }

        if (WEBHOOK_PADRAO.equals(segredoWebhook)) {
            problemas.add("APP_WEBHOOK_SECRET ainda é o valor de desenvolvimento.");
        }
        if (INGRESSO_PADRAO.equals(segredoIngresso)) {
            problemas.add("APP_TICKET_SECRET ainda é o valor de desenvolvimento.");
        }
        if (SENHA_BANCO_PADRAO.equals(senhaBanco)) {
            problemas.add("SPRING_DATASOURCE_PASSWORD ainda é a senha do docker-compose local.");
        }
        if (origensPermitidas != null && origensPermitidas.contains("localhost")) {
            problemas.add("APP_CORS_ALLOWED_ORIGINS aponta para localhost; "
                    + "informe a URL pública do frontend.");
        }

        return problemas;
    }

    /**
     * Mede a chave JWT em bits. Ela é Base64: o que importa é o tamanho depois
     * de decodificar, não o número de caracteres do texto.
     */
    private static int tamanhoEmBits(String chaveBase64) {
        try {
            return Base64.getDecoder().decode(chaveBase64).length * 8;
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "APP_SECURITY_JWT_SECRET_KEY não é Base64 válido.", e);
        }
    }
}
