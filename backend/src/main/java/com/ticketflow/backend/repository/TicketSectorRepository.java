package com.ticketflow.backend.repository;

import com.ticketflow.backend.entity.TicketSector;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketSectorRepository extends JpaRepository<TicketSector, UUID> {

    List<TicketSector> findByEventId(UUID eventId);

    void deleteByEventId(UUID eventId);

    // PESSIMISTIC_WRITE: gera SELECT ... FOR UPDATE no Postgres.
    // Bloqueia a linha do setor até o fim da transação — garante que apenas uma
    // thread pode decrementar available_seats ao mesmo tempo.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ts FROM TicketSector ts WHERE ts.id = :id")
    Optional<TicketSector> findByIdForUpdate(@Param("id") UUID id);
}
