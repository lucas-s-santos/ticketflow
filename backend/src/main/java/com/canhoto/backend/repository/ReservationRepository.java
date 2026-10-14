package com.canhoto.backend.repository;

import com.canhoto.backend.entity.Reservation;
import com.canhoto.backend.entity.ReservationStatus;
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

    // Usado pela limpeza dos testes; o scheduler usa a variante com trava abaixo.
    List<Reservation> findByStatusAndExpiresAtBefore(ReservationStatus status, OffsetDateTime now);

    /**
     * Reserva um lote de reservas vencidas para esta instância processar.
     *
     * <p>{@code FOR UPDATE SKIP LOCKED} é o que torna o scheduler seguro com mais
     * de uma instância: cada uma trava as linhas que pegou e as demais pulam
     * essas linhas em vez de esperar. Sem isso, duas instâncias liam a mesma
     * lista e devolviam os assentos ao estoque em dobro — o lock no setor
     * serializa as escritas, mas não impede o trabalho duplicado.
     *
     * <p>{@code ORDER BY ticket_sector_id} não é cosmético: o processamento trava
     * o setor de cada reserva em seguida, e ordenar por setor faz todas as
     * instâncias adquirirem esses locks na mesma sequência. Em ordens diferentes,
     * duas transações poderiam travar uma na outra.
     *
     * <p>O {@code LIMIT} limita o lote: a versão anterior carregava todas as
     * reservas vencidas numa única transação, o que num pico viraria problema
     * de memória e uma transação longa demais.
     */
    @Query(value = """
            SELECT * FROM reservations
            WHERE status = 'PENDING'
              AND expires_at < now()
            ORDER BY ticket_sector_id, expires_at
            LIMIT :limite
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<Reservation> travarVencidasParaExpirar(@Param("limite") int limite);

    // Guardas de integridade: a FK reservations -> ticket_sectors é RESTRICT, então
    // apagar um setor (ou o evento inteiro) com reservas estouraria no banco.
    // Checamos antes para devolver 409 com mensagem clara em vez de 500.
    boolean existsByTicketSectorId(UUID ticketSectorId);

    @Query("SELECT COUNT(r) > 0 FROM Reservation r WHERE r.ticketSector.event.id = :eventId")
    boolean existsByEventId(@Param("eventId") UUID eventId);

    // Dashboard: reservas de um status para todos os eventos de um organizador.
    // JOIN FETCH traz setor + evento na mesma query, evitando N+1 na agregação.
    @Query("SELECT r FROM Reservation r " +
           "JOIN FETCH r.ticketSector ts " +
           "JOIN FETCH ts.event e " +
           "WHERE e.owner.id = :ownerId AND r.status = :status")
    List<Reservation> findConfirmedForOwner(@Param("ownerId") UUID ownerId,
                                            @Param("status") ReservationStatus status);
}
