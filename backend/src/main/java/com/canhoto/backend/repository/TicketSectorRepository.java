package com.canhoto.backend.repository;

import com.canhoto.backend.entity.TicketSector;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketSectorRepository extends JpaRepository<TicketSector, UUID> {

    List<TicketSector> findByEventId(UUID eventId);

    /**
     * Setores de varios eventos numa consulta so.
     *
     * <p>Existe para matar o N+1 da listagem: antes, montar a resposta de N
     * eventos disparava N consultas de setor, uma por evento. Com 12 eventos
     * por pagina eram 13 idas ao banco em vez de 2.
     *
     * <p>O JOIN FETCH traz o evento junto porque o agrupamento le
     * {@code setor.getEvent().getId()}; sem ele, cada setor reabriria o proxy
     * preguicoso do evento e o N+1 voltaria pela porta dos fundos.
     */
    @Query("SELECT ts FROM TicketSector ts JOIN FETCH ts.event e WHERE e.id IN :eventoIds")
    List<TicketSector> findByEventIdIn(@Param("eventoIds") Collection<UUID> eventoIds);

    // PESSIMISTIC_WRITE: gera SELECT ... FOR UPDATE no Postgres.
    // Bloqueia a linha do setor até o fim da transação — garante que apenas uma
    // thread pode decrementar available_seats ao mesmo tempo.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ts FROM TicketSector ts WHERE ts.id = :id")
    Optional<TicketSector> findByIdForUpdate(@Param("id") UUID id);
}
