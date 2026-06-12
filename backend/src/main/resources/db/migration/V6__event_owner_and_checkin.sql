-- Dono do evento (organizador). Nullable: eventos criados antes desta fase ficam sem dono.
ALTER TABLE events ADD COLUMN owner_id UUID REFERENCES users(id);
CREATE INDEX idx_events_owner_id ON events (owner_id);

-- Marca de check-in do ingresso (reserva). NULL = ainda não usado;
-- preenchido = ingresso validado na portaria, impedindo reuso.
ALTER TABLE reservations ADD COLUMN checked_in_at TIMESTAMPTZ;
