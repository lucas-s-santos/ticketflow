package com.canhoto.backend.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// OncePerRequestFilter garante que este filtro roda EXATAMENTE UMA VEZ por requisição HTTP.
// É chamado pelo Spring Security antes de qualquer Controller.
// Fluxo: requisição → este filtro → SecurityConfig verifica se a rota precisa de auth → Controller
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // Se não há header Authorization ou não começa com "Bearer ", passa para o próximo filtro.
        // A SecurityConfig vai bloquear a requisição se a rota exigir autenticação.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7); // remove "Bearer "

        // Só autentica se não há autenticação prévia no contexto
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            autenticar(jwt, request);
        }

        filterChain.doFilter(request, response);
    }

    // Token vencido, malformado, assinado com outra chave ou de uma conta que não
    // existe mais vale o mesmo que token nenhum: a requisição segue como anônima.
    // Rota pública responde normalmente; rota protegida cai no 401 da
    // SecurityConfig, que é o sinal para o front derrubar a sessão. Deixar a
    // exceção subir fazia um token vencido quebrar até a lista pública de eventos.
    private void autenticar(String jwt, HttpServletRequest request) {
        try {
            final String userEmail = jwtService.extractEmail(jwt);
            if (userEmail == null) {
                return;
            }
            UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

            if (jwtService.isTokenValid(jwt, userDetails.getUsername())) {
                // Cria o objeto de autenticação do Spring Security com as authorities do usuário
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Seta no SecurityContextHolder: a partir daqui, o Spring sabe quem fez a requisição.
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException e) {
            log.debug("Token recusado: {}", e.getClass().getSimpleName());
        }
    }
}
