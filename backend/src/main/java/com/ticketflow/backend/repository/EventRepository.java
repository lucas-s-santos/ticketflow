package com.ticketflow.backend.repository;

import com.ticketflow.backend.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

// JpaRepository<Event, UUID>: o Spring Data gera automaticamente a implementação desta interface.
// Você ganha findAll(), findById(), save(), deleteById() e mais — sem escrever SQL.
// O segundo tipo genérico (UUID) é o tipo da chave primária.
@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

    // O Spring Data interpreta o nome do método e gera o SQL correspondente:
    // SELECT * FROM events ORDER BY date ASC
    List<Event> findAllByOrderByDateAsc();

    // Eventos de um organizador específico (usado no dashboard).
    List<Event> findByOwnerIdOrderByDateAsc(UUID ownerId);
}
