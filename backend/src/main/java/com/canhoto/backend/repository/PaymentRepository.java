package com.canhoto.backend.repository;

import com.canhoto.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    // Usado na checagem de idempotência: mesma chave = mesmo pagamento
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Optional<Payment> findByReservationId(UUID reservationId);
}
