-- V1__create_events_table.sql
-- Flyway executa este arquivo exatamente uma vez, registrando na tabela flyway_schema_history.
-- NUNCA edite este arquivo após executado. Crie um V2__ para alterações futuras.

CREATE TABLE events (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    date        TIMESTAMPTZ     NOT NULL,
    location    VARCHAR(500)    NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_events PRIMARY KEY (id)
);

-- Índice na coluna date: consulta mais comum é "listar eventos futuros ordenados por data"
CREATE INDEX idx_events_date ON events (date);
