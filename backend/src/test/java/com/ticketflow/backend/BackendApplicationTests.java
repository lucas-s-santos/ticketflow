package com.ticketflow.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

// @SpringBootTest: sobe o contexto completo do Spring para o teste.
// Fases futuras adicionarão Testcontainers aqui para rodar testes com Postgres real.
@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

    @Test
    void contextLoads() {
        // Garante que a aplicação sobe sem erros de configuração.
    }
}
