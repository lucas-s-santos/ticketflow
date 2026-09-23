package com.canhoto.backend.service;

import com.canhoto.backend.entity.Reservation;
import com.canhoto.backend.entity.ReservationStatus;
import com.canhoto.backend.entity.TicketSector;
import com.canhoto.backend.exception.ResourceNotFoundException;
import com.canhoto.backend.repository.ReservationRepository;
import com.canhoto.backend.repository.TicketSectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

// Serviço separado do ReservationService para evitar dependência circular.
// O @Scheduled roda em uma thread própria do Spring Task Executor.
//
// LIMITAÇÃO CONHECIDA: com mais de uma instância da aplicação, as duas rodariam este
// scheduler, leriam a mesma lista de reservas vencidas e devolveriam os assentos duas
// vezes. O lock no setor serializa as escritas, mas não deduplica o trabalho. Hoje o
// deploy é de instância única; para escalar, o caminho é ShedLock (lock distribuído)
// ou trocar a busca por um SELECT ... FOR UPDATE SKIP LOCKED sobre as reservas.
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationExpirationService {

    private final ReservationRepository reservationRepository;
    private final TicketSectorRepository ticketSectorRepository;

    // Uma transacao para todo o lote: ou todas as vagas voltam ao estoque, ou nenhuma.
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void expirePendingReservations() {
        List<Reservation> expired = reservationRepository
                .findByStatusAndExpiresAtBefore(ReservationStatus.PENDING, OffsetDateTime.now());

        if (expired.isEmpty()) {
            return;
        }

        log.info("Expirando {} reserva(s) vencida(s)", expired.size());

        for (Reservation reservation : expired) {
            // Lock pessimista para restaurar vagas de forma segura
            UUID sectorId = reservation.getTicketSector().getId();
            TicketSector sector = ticketSectorRepository.findByIdForUpdate(sectorId)
                    .orElseThrow(() -> new ResourceNotFoundException("Setor não encontrado: " + sectorId));
            sector.setAvailableSeats(sector.getAvailableSeats() + reservation.getQuantity());
            ticketSectorRepository.save(sector);

            reservation.setStatus(ReservationStatus.EXPIRED);
            reservationRepository.save(reservation);
            log.info("Reserva expirada: id={}, setor={}, vagas_restauradas={}",
                    reservation.getId(), sector.getId(), reservation.getQuantity());
        }
    }
}
