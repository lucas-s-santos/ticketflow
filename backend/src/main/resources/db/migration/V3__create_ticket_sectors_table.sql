-- V3__create_ticket_sectors_table.sql
-- Cria a tabela de setores de ingresso vinculados a eventos.
-- ON DELETE CASCADE: ao deletar um evento, todos os seus setores são removidos automaticamente.

CREATE TABLE ticket_sectors (
    id              UUID           NOT NULL DEFAULT gen_random_uuid(),
    event_id        UUID           NOT NULL,
    name            VARCHAR(100)   NOT NULL,
    capacity        INTEGER        NOT NULL,
    available_seats INTEGER        NOT NULL,
    price           NUMERIC(10, 2) NOT NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ticket_sectors PRIMARY KEY (id),
    CONSTRAINT fk_ticket_sectors_event
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_ticket_sectors_event_id ON ticket_sectors (event_id);
