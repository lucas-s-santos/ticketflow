package com.canhoto.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Setor de ingresso de um evento: Pista, VIP, Camarote. */
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer capacity;

    /**
     * Assentos ainda livres. Toda escrita neste campo passa por
     * {@code findByIdForUpdate}, que trava a linha: sem isso duas reservas
     * simultaneas leem o mesmo valor e vendem o mesmo lugar duas vezes.
     */
    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats;

    /** BigDecimal, nunca double: dinheiro nao aceita erro de arredondamento binario. */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
