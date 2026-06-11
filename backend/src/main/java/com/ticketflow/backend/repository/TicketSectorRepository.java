package com.ticketflow.backend.repository;

import com.ticketflow.backend.entity.TicketSector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketSectorRepository extends JpaRepository<TicketSector, UUID> {

    List<TicketSector> findByEventId(UUID eventId);

    void deleteByEventId(UUID eventId);
}
