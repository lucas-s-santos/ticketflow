-- V2__create_users_table.sql
-- Cria o tipo ENUM de role e a tabela de usuários.

CREATE TYPE user_role AS ENUM ('ORGANIZADOR', 'CLIENTE');

CREATE TABLE users (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);
