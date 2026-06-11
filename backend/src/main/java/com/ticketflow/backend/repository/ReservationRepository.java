package com.ticketflow.backend.repository;

import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    List<Reservation> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // Usado pelo scheduler de expiração: busca reservas PENDING cujo prazo já passou
    List<Reservation> findByStatusAndExpiresAtBefore(ReservationStatus status, OffsetDateTime now);
}
