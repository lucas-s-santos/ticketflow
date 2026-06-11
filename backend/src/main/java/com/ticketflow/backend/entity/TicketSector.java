package com.ticketflow.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

// Setor de ingresso: Pista, VIP, Camarote, etc.
// @ManyToOne: muitos setores pertencem a um evento.
// A FK event_id na tabela ticket_sectors referencia events(id).
@Entity
@Table(name = "ticket_sectors")
@Getter
@Setter
@NoArgsConstructor
public class TicketSector {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    // @ManyToOne: cada TicketSector pertence a um Event.
    // FetchType.LAZY: o Event NÃO é carregado automaticamente quando buscamos um TicketSector.
    // Isso evita queries desnecessárias. O Spring carrega só quando acessamos setor.getEvent().
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false, length = 100)
    private String name;

    // capacity: total de assentos do setor.
    @Column(nullable = false)
    private Integer capacity;

    // availableSeats: assentos ainda disponíveis. Começa igual ao capacity e decrementa a cada reserva.
    // A lógica de concorrência (Fase 3) vai proteger este campo com lock pessimista.
    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats;

    // BigDecimal para valores monetários: evita erros de arredondamento de double/float.
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
