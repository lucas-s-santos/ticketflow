package com.canhoto.backend.service;

import com.canhoto.backend.dto.EventStatsDto;
import com.canhoto.backend.dto.OrganizerDashboardDto;
import com.canhoto.backend.dto.SectorStatsDto;
import com.canhoto.backend.entity.Event;
import com.canhoto.backend.entity.Reservation;
import com.canhoto.backend.entity.ReservationStatus;
import com.canhoto.backend.entity.TicketSector;
import com.canhoto.backend.repository.EventRepository;
import com.canhoto.backend.repository.ReservationRepository;
import com.canhoto.backend.repository.TicketSectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Monta o painel do organizador: agrega vendas confirmadas por setor/evento.
@Service
@RequiredArgsConstructor
public class OrganizerDashboardService {

    private final EventRepository eventRepository;
    private final TicketSectorRepository ticketSectorRepository;
    private final ReservationRepository reservationRepository;

    // Acumulador de vendas por setor. "entradas" conta ingressos, não reservas:
    // o check-in é por reserva, e uma reserva pode valer vários ingressos.
    private record Sales(int qty, BigDecimal revenue, int entradas) {
        static Sales empty() { return new Sales(0, BigDecimal.ZERO, 0); }
        Sales add(Sales outra) {
            return new Sales(qty + outra.qty, revenue.add(outra.revenue), entradas + outra.entradas);
        }
    }

    @Transactional(readOnly = true)
    public OrganizerDashboardDto getDashboard(UUID organizerId) {
        // Vendas confirmadas indexadas por setor (uma query, sem N+1)
        Map<UUID, Sales> salesBySector = new HashMap<>();
        for (Reservation r : reservationRepository.findConfirmedForOwner(organizerId, ReservationStatus.CONFIRMED)) {
            UUID sectorId = r.getTicketSector().getId();
            int entradas = r.getCheckedInAt() != null ? r.getQuantity() : 0;
            salesBySector.merge(sectorId, new Sales(r.getQuantity(), r.getTotalPrice(), entradas), Sales::add);
        }

        List<Event> events = eventRepository.findByOwnerIdOrderByDateAsc(organizerId);

        long totalTicketsSold = 0;
        long totalCheckedIn = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        List<EventStatsDto> eventStats = new java.util.ArrayList<>();

        for (Event event : events) {
            List<TicketSector> sectors = ticketSectorRepository.findByEventId(event.getId());

            List<SectorStatsDto> sectorStats = new java.util.ArrayList<>();
            int eventCapacity = 0;
            int eventSold = 0;
            int eventCheckedIn = 0;
            BigDecimal eventRevenue = BigDecimal.ZERO;

            for (TicketSector s : sectors) {
                Sales sales = salesBySector.getOrDefault(s.getId(), Sales.empty());
                sectorStats.add(new SectorStatsDto(
                        s.getName(), s.getCapacity(), sales.qty(), s.getAvailableSeats(), sales.revenue(),
                        sales.entradas()));
                eventCapacity += s.getCapacity();
                eventSold += sales.qty();
                eventCheckedIn += sales.entradas();
                eventRevenue = eventRevenue.add(sales.revenue());
            }

            eventStats.add(new EventStatsDto(
                    event.getId(), event.getName(), event.getDate(),
                    eventCapacity, eventSold, eventCheckedIn, eventRevenue, sectorStats));

            totalTicketsSold += eventSold;
            totalCheckedIn += eventCheckedIn;
            totalRevenue = totalRevenue.add(eventRevenue);
        }

        return new OrganizerDashboardDto(events.size(), totalTicketsSold, totalCheckedIn, totalRevenue, eventStats);
    }
}
