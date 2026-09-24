package com.canhoto.backend.repository;

import com.canhoto.backend.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

    /**
     * Listagem publica paginada. A ordenacao vem do Pageable, com padrao
     * definido no controller.
     */
    Page<Event> findAllBy(Pageable pageable);

    List<Event> findByOwnerIdOrderByDateAsc(UUID ownerId);
}
