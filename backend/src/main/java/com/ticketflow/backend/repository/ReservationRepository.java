package com.ticketflow.backend.repository;

import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    List<Reservation> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // Usado pelo scheduler de expiração: busca reservas PENDING cujo prazo já passou
    List<Reservation> findByStatusAndExpiresAtBefore(ReservationStatus status, OffsetDateTime now);

    // Dashboard: reservas de um status para todos os eventos de um organizador.
    // JOIN FETCH traz setor + evento na mesma query, evitando N+1 na agregação.
    @Query("SELECT r FROM Reservation r " +
           "JOIN FETCH r.ticketSector ts " +
           "JOIN FETCH ts.event e " +
           "WHERE e.owner.id = :ownerId AND r.status = :status")
    List<Reservation> findConfirmedForOwner(@Param("ownerId") UUID ownerId,
                                            @Param("status") ReservationStatus status);
}
