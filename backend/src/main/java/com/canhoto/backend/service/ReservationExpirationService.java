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

import java.util.List;
import java.util.UUID;

/**
 * Devolve ao estoque os assentos de reservas que venceram sem pagamento.
 *
 * <p>Vive separado do {@code ReservationService} para não criar dependência
 * circular entre eles.
 *
 * <p>É seguro rodar em várias instâncias ao mesmo tempo: a busca usa
 * {@code FOR UPDATE SKIP LOCKED}, então cada instância processa um conjunto
 * disjunto de reservas. Antes, todas liam a mesma lista e devolviam as vagas
 * em dobro.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationExpirationService {

    /**
     * Teto de reservas por execução. Um lote grande demais prenderia centenas de
     * locks numa transação longa; se houver fila maior que isto, ela drena nas
     * execuções seguintes, a cada minuto.
     */
    private static final int TAMANHO_DO_LOTE = 200;

    private final ReservationRepository reservationRepository;
    private final TicketSectorRepository ticketSectorRepository;

    // Uma transacao para todo o lote: ou todas as vagas voltam ao estoque, ou nenhuma.
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void expirePendingReservations() {
        List<Reservation> vencidas = reservationRepository.travarVencidasParaExpirar(TAMANHO_DO_LOTE);

        if (vencidas.isEmpty()) {
            return;
        }

        log.info("Expirando {} reserva(s) vencida(s)", vencidas.size());

        for (Reservation reserva : vencidas) {
            UUID setorId = reserva.getTicketSector().getId();
            TicketSector setor = ticketSectorRepository.findByIdForUpdate(setorId)
                    .orElseThrow(() -> new ResourceNotFoundException("Setor não encontrado: " + setorId));

            setor.setAvailableSeats(setor.getAvailableSeats() + reserva.getQuantity());
            ticketSectorRepository.save(setor);

            reserva.setStatus(ReservationStatus.EXPIRED);
            reservationRepository.save(reserva);

            log.info("Reserva expirada: id={}, setor={}, vagas_restauradas={}",
                    reserva.getId(), setor.getId(), reserva.getQuantity());
        }

        if (vencidas.size() == TAMANHO_DO_LOTE) {
            log.info("Lote cheio — pode haver mais reservas vencidas na próxima execução");
        }
    }
}
