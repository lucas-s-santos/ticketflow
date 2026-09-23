package com.canhoto.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /** Nullable: eventos criados antes da V6 não têm dono e seguem editáveis por qualquer organizador. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /** TEXT em vez de VARCHAR(n): não há limite defensável para uma descrição de evento. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** OffsetDateTime mapeia para TIMESTAMPTZ; LocalDateTime perderia o fuso e quebraria eventos de outra região. */
    @Column(name = "date", nullable = false)
    private OffsetDateTime date;

    @Column(name = "location", nullable = false, length = 500)
    private String location;

    /**
     * Endereço da imagem, não o arquivo. O disco do Render é efêmero e perderia
     * qualquer upload a cada deploy; se um serviço de armazenamento for plugado
     * depois, é a URL devolvida por ele que entra aqui.
     */
    @Column(name = "cover_image_url", length = 1000)
    private String coverImageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
