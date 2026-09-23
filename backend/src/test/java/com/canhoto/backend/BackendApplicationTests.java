package com.canhoto.backend;

import org.junit.jupiter.api.Test;

// Sobe o contexto inteiro. Pega erro de configuracao — bean faltando, propriedade
// invalida, schema divergente do Flyway — que teste unitario nunca alcanca.
class BackendApplicationTests extends IntegrationTest {

    @Test
    void contextLoads() {
        // Garante que a aplicação sobe sem erros de configuração.
    }
}
