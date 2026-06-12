CREATE TYPE payment_status AS ENUM ('PROCESSING', 'APPROVED', 'DECLINED');
CREATE TYPE payment_method AS ENUM ('PIX', 'CREDIT_CARD');

CREATE TABLE payments (
    id              UUID           NOT NULL DEFAULT gen_random_uuid(),
    reservation_id  UUID           NOT NULL,
    idempotency_key VARCHAR(255)   NOT NULL,
    amount          NUMERIC(10, 2) NOT NULL,
    method          payment_method NOT NULL,
    status          payment_status NOT NULL DEFAULT 'PROCESSING',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_payments PRIMARY KEY (id),
    CONSTRAINT fk_payments_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    -- Guard da idempotência: o banco rejeita um segundo pagamento com a mesma chave
    CONSTRAINT uq_payments_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX idx_payments_reservation_id ON payments (reservation_id);
