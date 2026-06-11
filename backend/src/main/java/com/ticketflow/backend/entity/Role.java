package com.ticketflow.backend.entity;

// Enum de papéis do sistema. Deve ser idêntico ao tipo user_role criado no Postgres (V2).
// Spring Security usa o prefixo "ROLE_" nas authorities; a SecurityConfig usa hasRole("ORGANIZADOR")
// que internamente busca por "ROLE_ORGANIZADOR".
public enum Role {
    ORGANIZADOR,
    CLIENTE
}
