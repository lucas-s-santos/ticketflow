package com.ticketflow.backend.controller;

import com.ticketflow.backend.dto.AuthResponseDto;
import com.ticketflow.backend.dto.LoginRequestDto;
import com.ticketflow.backend.dto.RegisterRequestDto;
import com.ticketflow.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registro e autenticação de usuários")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Registra um novo usuário (ORGANIZADOR ou CLIENTE)")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody RegisterRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(dto));
    }

    @PostMapping("/login")
    @Operation(summary = "Autentica e retorna o token JWT")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginRequestDto dto) {
        return ResponseEntity.ok(authService.login(dto));
    }
}
