package com.ticketflow.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

// RestClient é o cliente HTTP síncrono do Spring (sucessor do RestTemplate).
// Usado pelo PaymentProcessor para entregar o webhook assinado ao endpoint.
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient() {
        return RestClient.create();
    }
}
