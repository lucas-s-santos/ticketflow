package com.ticketflow.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// @SpringBootApplication combina três anotações:
//   @Configuration  → esta classe pode declarar beans Spring
//   @EnableAutoConfiguration → Spring Boot configura automaticamente tudo que encontrar no classpath
//   @ComponentScan  → escaneia este pacote e subpacotes por @Service, @Repository, @Controller etc.
@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
