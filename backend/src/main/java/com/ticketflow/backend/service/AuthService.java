package com.ticketflow.backend.service;

import com.ticketflow.backend.dto.AuthResponseDto;
import com.ticketflow.backend.dto.LoginRequestDto;
import com.ticketflow.backend.dto.RegisterRequestDto;
import com.ticketflow.backend.entity.User;
import com.ticketflow.backend.exception.ResourceNotFoundException;
import com.ticketflow.backend.repository.UserRepository;
import com.ticketflow.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${app.security.jwt.expiration-ms}")
    private long expirationMs;

    public AuthResponseDto register(RegisterRequestDto dto) {
        if (userRepository.existsByEmail(dto.email())) {
            throw new IllegalArgumentException("Email já está em uso: " + dto.email());
        }

        User user = new User();
        user.setName(dto.name());
        user.setEmail(dto.email());
        // BCrypt faz o hash da senha — nunca salvamos texto puro no banco
        user.setPasswordHash(passwordEncoder.encode(dto.password()));
        user.setRole(dto.role());

        userRepository.save(user);
        log.info("Novo usuário registrado: email={}, role={}", user.getEmail(), user.getRole());

        String token = jwtService.generateToken(user);
        return toAuthResponse(user, token);
    }

    public AuthResponseDto login(LoginRequestDto dto) {
        // authenticationManager.authenticate() lança BadCredentialsException se email/senha inválidos.
        // Internamente, chama UserDetailsServiceImpl.loadUserByUsername() e BCrypt.matches().
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dto.email(), dto.password())
        );

        User user = userRepository.findByEmail(dto.email())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        log.info("Login bem-sucedido: email={}", user.getEmail());
        String token = jwtService.generateToken(user);
        return toAuthResponse(user, token);
    }

    private AuthResponseDto toAuthResponse(User user, String token) {
        return new AuthResponseDto(
                token,
                "Bearer",
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                expirationMs
        );
    }
}
