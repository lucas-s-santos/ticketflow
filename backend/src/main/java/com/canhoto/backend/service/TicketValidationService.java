package com.canhoto.backend.service;

import com.canhoto.backend.dto.TicketValidationResultDto;
import com.canhoto.backend.entity.Event;
import com.canhoto.backend.entity.Reservation;
import com.canhoto.backend.entity.ReservationStatus;
import com.canhoto.backend.exception.TicketValidationException;
import com.canhoto.backend.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

// Valida o ingresso na portaria e faz o check-in (marca como usado).
@Slf4j
@Service
@RequiredArgsConstructor
public class TicketValidationService {

    private final TicketTokenService ticketTokenService;
    private final ReservationRepository reservationRepository;

    @Transactional
    public TicketValidationResultDto validate(String token, UUID organizerId) {
        // 1. Assinatura HMAC
        UUID reservationId;
        try {
            reservationId = ticketTokenService.verifyAndExtract(token);
        } catch (TicketValidationException e) {
            return TicketValidationResultDto.invalid("INVALID_SIGNATURE");
        }

        // 2. Reserva existe
        Reservation reservation = reservationRepository.findById(reservationId).orElse(null);
        if (reservation == null) {
            return TicketValidationResultDto.invalid("NOT_FOUND");
        }

        // 3. Está paga
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            return TicketValidationResultDto.invalid("NOT_CONFIRMED");
        }

        // 4. O organizador é dono do evento do ingresso
        Event event = reservation.getTicketSector().getEvent();
        if (event.getOwner() == null || !event.getOwner().getId().equals(organizerId)) {
            return TicketValidationResultDto.invalid("NOT_OWNER");
        }

        // 5. Ainda não foi usado
        if (reservation.getCheckedInAt() != null) {
            return new TicketValidationResultDto(false, "ALREADY_USED",
                    event.getName(), reservation.getTicketSector().getName(),
                    reservation.getUser().getName(), reservation.getQuantity(),
                    reservation.getCheckedInAt());
        }

        // 6. Check-in
        reservation.setCheckedInAt(OffsetDateTime.now());
        reservationRepository.save(reservation);
        log.info("Check-in OK: reserva={}, evento={}, organizador={}",
                reservation.getId(), event.getId(), organizerId);

        return new TicketValidationResultDto(true, "OK",
                event.getName(), reservation.getTicketSector().getName(),
                reservation.getUser().getName(), reservation.getQuantity(),
                reservation.getCheckedInAt());
    }
}
