package com.canhoto.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reservations")
@Getter
@Setter
@NoArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_sector_id", nullable = false)
    private TicketSector ticketSector;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    /** ENUM nativo do Postgres, mesma exigencia de {@link User#getAuthorities()}. */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "reservation_status")
    private ReservationStatus status;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    /** NULL enquanto o ingresso nao foi usado. E o unico bloqueio contra reentrada com o mesmo QR. */
    @Column(name = "checked_in_at")
    private OffsetDateTime checkedInAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
