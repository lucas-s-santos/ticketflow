package com.canhoto.backend;

import org.junit.jupiter.api.BeforeAll;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Base dos testes que precisam de Postgres e RabbitMQ.
 *
 * <p>A infraestrutura vem do {@code docker compose}, não de Testcontainers.
 * A tentativa de migrar esbarrou num bug de compatibilidade entre o Docker
 * Engine 29.x e o cliente docker-java embarcado no Testcontainers: o handshake
 * devolve HTTP 400 com um payload vazio e a biblioteca conclui, erradamente,
 * que não existe Docker na máquina. Detalhes e o estado da correção em
 * <a href="https://github.com/testcontainers/testcontainers-java/issues/11212">
 * testcontainers-java#11212</a>. A linha 2.x já corrige, mas mudou as
 * coordenadas dos artefatos e não é gerenciada pelo BOM do Spring Boot 3.3.
 *
 * <p>Enquanto isso, esta classe resolve o problema que motivou a migração: sem
 * ela, quem esquecia de subir a infraestrutura recebia um erro de conexão
 * enterrado em dezenas de linhas de stack trace do Hikari. Agora a falha é
 * imediata e diz o que fazer.
 *
 * <p>Não usamos H2 em nenhum caso: os testes dependem de {@code SELECT ... FOR
 * UPDATE} e dos tipos nativos do Postgres. Testar concorrência contra um banco
 * em memória testaria o banco em memória.
 */
@SpringBootTest
public abstract class IntegrationTest {

    private static final Map<String, Integer> DEPENDENCIAS = new LinkedHashMap<>() {{
        put("PostgreSQL", 5432);
        put("RabbitMQ", 5672);
    }};

    private static final int TIMEOUT_MS = 1500;

    @BeforeAll
    static void exigirInfraestrutura() {
        for (Map.Entry<String, Integer> dependencia : DEPENDENCIAS.entrySet()) {
            if (!respondeEm(dependencia.getValue())) {
                throw new IllegalStateException("""
                        %s não respondeu em localhost:%d.

                        Os testes de integração usam banco e broker de verdade. Suba a \
                        infraestrutura antes de rodar:

                            docker compose up -d

                        """.formatted(dependencia.getKey(), dependencia.getValue()));
            }
        }
    }

    private static boolean respondeEm(int porta) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("localhost", porta), TIMEOUT_MS);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
