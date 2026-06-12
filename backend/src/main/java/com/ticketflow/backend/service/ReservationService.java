package com.ticketflow.backend.service;

import com.ticketflow.backend.dto.ReservationRequestDto;
import com.ticketflow.backend.dto.ReservationResponseDto;
import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import com.ticketflow.backend.entity.TicketSector;
import com.ticketflow.backend.entity.User;
import com.ticketflow.backend.exception.ResourceNotFoundException;
import com.ticketflow.backend.repository.ReservationRepository;
import com.ticketflow.backend.repository.TicketSectorRepository;
import com.ticketflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TicketSectorRepository ticketSectorRepository;
    private final UserRepository userRepository;
    private final TicketTokenService ticketTokenService;

    @Transactional
    public ReservationResponseDto reserve(UUID userId, ReservationRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        // findByIdForUpdate emite SELECT ... FOR UPDATE.
        // O Postgres bloqueia esta linha até o commit/rollback — outras threads ficam esperando.
        // Quando a segunda thread obter o lock, verá o valor de available_seats já decrementado.
        TicketSector sector = ticketSectorRepository.findByIdForUpdate(dto.ticketSectorId())
                .orElseThrow(() -> new ResourceNotFoundException("Setor não encontrado: " + dto.ticketSectorId()));

        if (sector.getAvailableSeats() < dto.quantity()) {
            throw new IllegalStateException(
                    "Assentos insuficientes: disponíveis=" + sector.getAvailableSeats() +
                    ", solicitados=" + dto.quantity());
        }

        sector.setAvailableSeats(sector.getAvailableSeats() - dto.quantity());
        ticketSectorRepository.save(sector);

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setTicketSector(sector);
        reservation.setQuantity(dto.quantity());
        reservation.setTotalPrice(sector.getPrice().multiply(BigDecimal.valueOf(dto.quantity())));
        reservation.setStatus(ReservationStatus.PENDING);
        reservation.setExpiresAt(OffsetDateTime.now().plusMinutes(15));

        Reservation saved = reservationRepository.save(reservation);
        log.info("Reserva criada: id={}, user={}, setor={}, qtd={}",
                saved.getId(), userId, sector.getId(), dto.quantity());
        return toResponseDto(saved);
    }

    @Transactional
    public void cancel(UUID reservationId, UUID userId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reserva não encontrada: " + reservationId));

        if (!reservation.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Esta reserva não pertence ao usuário");
        }
        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalStateException(
                    "Apenas reservas PENDING podem ser canceladas. Status atual: " + reservation.getStatus());
        }

        TicketSector sector = ticketSectorRepository
                .findByIdForUpdate(reservation.getTicketSector().getId()).get();
        sector.setAvailableSeats(sector.getAvailableSeats() + reservation.getQuantity());
        ticketSectorRepository.save(sector);

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);
        log.info("Reserva cancelada: id={}", reservationId);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponseDto> findByUser(UUID userId) {
        return reservationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponseDto)
                .toList();
    }

    ReservationResponseDto toResponseDto(Reservation r) {
        // O token do ingresso só faz sentido para reservas pagas (CONFIRMED).
        String ticketToken = r.getStatus() == ReservationStatus.CONFIRMED
                ? ticketTokenService.generate(r.getId())
                : null;
        return new ReservationResponseDto(
                r.getId(),
                r.getTicketSector().getId(),
                r.getTicketSector().getName(),
                r.getTicketSector().getEvent().getName(),
                r.getQuantity(),
                r.getTotalPrice(),
                r.getStatus().name(),
                r.getExpiresAt(),
                r.getCreatedAt(),
                ticketToken,
                r.getCheckedInAt()
        );
    }
}
