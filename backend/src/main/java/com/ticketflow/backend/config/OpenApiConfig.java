package com.ticketflow.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// @Configuration: esta classe declara beans Spring (objetos gerenciados pelo container).
// @Bean: o método retorna um objeto que o Spring vai gerenciar e injetar onde necessário.
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("TicketFlow API")
                        .description("Plataforma de venda de ingressos para eventos")
                        .version("v1.0"));
    }
}
