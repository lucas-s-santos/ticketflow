CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

CREATE TABLE reservations (
    id               UUID               NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID               NOT NULL,
    ticket_sector_id UUID               NOT NULL,
    quantity         INTEGER            NOT NULL,
    total_price      NUMERIC(10, 2)     NOT NULL,
    status           reservation_status NOT NULL DEFAULT 'PENDING',
    expires_at       TIMESTAMPTZ        NOT NULL,
    created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_reservations PRIMARY KEY (id),
    CONSTRAINT fk_reservations_user   FOREIGN KEY (user_id)          REFERENCES users(id),
    CONSTRAINT fk_reservations_sector FOREIGN KEY (ticket_sector_id) REFERENCES ticket_sectors(id),
    CONSTRAINT chk_quantity CHECK (quantity > 0)
);

-- Índice para buscar reservas de um usuário (GET /api/reservations/me)
CREATE INDEX idx_reservations_user_id ON reservations (user_id);

-- Índice parcial: o scheduler só precisa varrer reservas PENDING expiradas
CREATE INDEX idx_reservations_status_expiry ON reservations (status, expires_at)
    WHERE status = 'PENDING';
