package com.ticketflow.backend.service;

import com.ticketflow.backend.dto.EventStatsDto;
import com.ticketflow.backend.dto.OrganizerDashboardDto;
import com.ticketflow.backend.dto.SectorStatsDto;
import com.ticketflow.backend.entity.Event;
import com.ticketflow.backend.entity.Reservation;
import com.ticketflow.backend.entity.ReservationStatus;
import com.ticketflow.backend.entity.TicketSector;
import com.ticketflow.backend.repository.EventRepository;
import com.ticketflow.backend.repository.ReservationRepository;
import com.ticketflow.backend.repository.TicketSectorRepository;
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

    // Acumulador de vendas por setor
    private record Sales(int qty, BigDecimal revenue) {
        static Sales empty() { return new Sales(0, BigDecimal.ZERO); }
        Sales add(int q, BigDecimal r) { return new Sales(qty + q, revenue.add(r)); }
    }

    @Transactional(readOnly = true)
    public OrganizerDashboardDto getDashboard(UUID organizerId) {
        // Vendas confirmadas indexadas por setor (uma query, sem N+1)
        Map<UUID, Sales> salesBySector = new HashMap<>();
        for (Reservation r : reservationRepository.findConfirmedForOwner(organizerId, ReservationStatus.CONFIRMED)) {
            UUID sectorId = r.getTicketSector().getId();
            salesBySector.merge(sectorId,
                    new Sales(r.getQuantity(), r.getTotalPrice()),
                    (a, b) -> a.add(b.qty(), b.revenue()));
        }

        List<Event> events = eventRepository.findByOwnerIdOrderByDateAsc(organizerId);

        long totalTicketsSold = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        List<EventStatsDto> eventStats = new java.util.ArrayList<>();

        for (Event event : events) {
            List<TicketSector> sectors = ticketSectorRepository.findByEventId(event.getId());

            List<SectorStatsDto> sectorStats = new java.util.ArrayList<>();
            int eventCapacity = 0;
            int eventSold = 0;
            BigDecimal eventRevenue = BigDecimal.ZERO;

            for (TicketSector s : sectors) {
                Sales sales = salesBySector.getOrDefault(s.getId(), Sales.empty());
                sectorStats.add(new SectorStatsDto(
                        s.getName(), s.getCapacity(), sales.qty(), s.getAvailableSeats(), sales.revenue()));
                eventCapacity += s.getCapacity();
                eventSold += sales.qty();
                eventRevenue = eventRevenue.add(sales.revenue());
            }

            eventStats.add(new EventStatsDto(
                    event.getId(), event.getName(), event.getDate(),
                    eventCapacity, eventSold, eventRevenue, sectorStats));

            totalTicketsSold += eventSold;
            totalRevenue = totalRevenue.add(eventRevenue);
        }

        return new OrganizerDashboardDto(events.size(), totalTicketsSold, totalRevenue, eventStats);
    }
}
