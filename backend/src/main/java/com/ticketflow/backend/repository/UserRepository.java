package com.ticketflow.backend.repository;

import com.ticketflow.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // Spring Data deriva o SQL: SELECT * FROM users WHERE email = ?
    // Optional<User> evita NullPointerException: quem chama trata o caso "não encontrado".
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
