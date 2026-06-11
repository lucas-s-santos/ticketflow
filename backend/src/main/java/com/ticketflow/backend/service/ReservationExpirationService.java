package com.ticketflow.backend.service;

import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import com.ticketflow.backend.entity.TicketSector;
import com.ticketflow.backend.repository.ReservationRepository;
import com.ticketflow.backend.repository.TicketSectorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

// Serviço separado do ReservationService para evitar dependência circular.
// O @Scheduled roda em uma thread própria do Spring Task Executor.
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationExpirationService {

    private final ReservationRepository reservationRepository;
    private final TicketSectorRepository ticketSectorRepository;

    // fixedRate: executa a cada 60 segundos, independentemente de quanto tempo o método levou.
    // @Transactional: todas as atualizações dentro do loop acontecem em uma única transação.
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
            TicketSector sector = ticketSectorRepository
                    .findByIdForUpdate(reservation.getTicketSector().getId()).get();
            sector.setAvailableSeats(sector.getAvailableSeats() + reservation.getQuantity());
            ticketSectorRepository.save(sector);

            reservation.setStatus(ReservationStatus.EXPIRED);
            reservationRepository.save(reservation);
            log.info("Reserva expirada: id={}, setor={}, vagas_restauradas={}",
                    reservation.getId(), sector.getId(), reservation.getQuantity());
        }
    }
}
