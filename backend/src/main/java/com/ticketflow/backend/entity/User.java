package com.ticketflow.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

// implements UserDetails: contrato do Spring Security para representar um usuário autenticado.
// O Spring Security usa esta interface em todo o fluxo de autenticação — não usa a nossa classe
// diretamente, mas sim o que esses métodos retornam.
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    // Armazena o hash BCrypt, nunca a senha em texto puro.
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    // @Enumerated(STRING): persiste o nome do enum ("ORGANIZADOR") em vez do índice numérico (0, 1).
    // @JdbcTypeCode(NAMED_ENUM): instrui o Hibernate 6 a usar o tipo ENUM nativo do Postgres.
    // Sem esta anotação, o Hibernate enviaria uma String comum e o Postgres rejeitaria
    // com "column is of type user_role but expression is of type character varying".
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "user_role")
    private Role role;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    // ─── Métodos do contrato UserDetails ──────────────────────────────────────

    // getAuthorities(): diz ao Spring Security quais permissões este usuário tem.
    // "ROLE_ORGANIZADOR" é a convenção para hasRole("ORGANIZADOR") funcionar na SecurityConfig.
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    // getPassword(): o Spring Security chama este método para comparar com a senha fornecida.
    // Retornamos o hash BCrypt; o BCryptPasswordEncoder sabe como comparar.
    @Override
    public String getPassword() {
        return passwordHash;
    }

    // getUsername(): identificador único do usuário. Usamos email (não o campo "name").
    @Override
    public String getUsername() {
        return email;
    }

    // Os métodos abaixo controlam o status da conta. Por simplicidade, retornam true (conta sempre válida).
    // Em produção real, você adicionaria campos is_enabled, is_locked, etc.
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
