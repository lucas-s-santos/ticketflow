package com.ticketflow.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

// @Entity: diz ao Hibernate que esta classe é gerenciada e mapeia para uma tabela do banco.
// @Table(name = "events"): define explicitamente o nome da tabela (evita surpresas com renomeações).
@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
public class Event {

    // @Id: este campo é a chave primária.
    // @GeneratedValue(UUID): o Hibernate gera um UUID antes de cada INSERT.
    // updatable = false: Hibernate nunca inclui este campo em comandos UPDATE.
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // Organizador dono do evento. LAZY: só carrega o User quando acessado.
    // Nullable porque eventos criados antes da Fase 6 não têm dono.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    // columnDefinition = "TEXT": sem limite de tamanho, melhor que VARCHAR(5000) arbitrário.
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // OffsetDateTime mapeia corretamente para TIMESTAMPTZ do Postgres (sempre com fuso horário).
    @Column(name = "date", nullable = false)
    private OffsetDateTime date;

    @Column(name = "location", nullable = false, length = 500)
    private String location;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // @PrePersist: Hibernate chama este método automaticamente antes de cada INSERT.
    // Assim, createdAt é sempre preenchido pelo código, não dependendo do valor enviado pelo cliente.
    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
