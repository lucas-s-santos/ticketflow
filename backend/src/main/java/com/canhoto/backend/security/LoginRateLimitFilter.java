package com.canhoto.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.canhoto.backend.exception.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Barra força bruta nos endpoints de autenticação antes que eles cheguem ao
 * BCrypt, que é caro de propósito e por isso também é um vetor de carga.
 *
 * <p>Roda antes do {@link JwtAuthenticationFilter}: não faz sentido validar
 * token numa requisição que já vai ser recusada.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> ROTAS_PROTEGIDAS =
            Set.of("/api/auth/login", "/api/auth/register");

    private final LoginRateLimiter limiter;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !HttpMethod.POST.matches(request.getMethod())
                || !ROTAS_PROTEGIDAS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        // getRemoteAddr() já reflete o cliente real: server.forward-headers-strategy
        // faz o Spring ler X-Forwarded-For. Isso pressupõe que só a plataforma
        // escreve esse header — se ele chegasse do cliente, bastaria forjá-lo a
        // cada tentativa para nunca esbarrar no limite.
        String origem = request.getRemoteAddr();

        if (!limiter.permitir(origem)) {
            log.warn("Rate limit atingido em {} por {}", request.getRequestURI(), origem);
            // A API de Servlet não tem constante para 429: o status foi definido
            // depois dela, na RFC 6585.
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getWriter(), new ErrorResponse(
                    "TOO_MANY_REQUESTS",
                    "Muitas tentativas. Aguarde alguns minutos antes de tentar de novo."));
            return;
        }

        filterChain.doFilter(request, response);

        // Login aceito devolve o saldo: quem acertou a senha não deve ficar perto
        // do bloqueio por ter errado antes.
        if (response.getStatus() == HttpServletResponse.SC_OK) {
            limiter.liberar(origem);
        }
    }
}
