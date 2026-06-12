package com.ticketflow.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketflow.backend.exception.ErrorResponse;
import com.ticketflow.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

// @EnableWebSecurity: ativa a configuração de segurança customizada.
// Esta classe substitui o CorsConfig.java anterior (que não funciona quando Spring Security está ativo).
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    // SecurityFilterChain: define as regras de segurança HTTP.
    // Pense como um porteiro: recebe cada requisição e decide se deixa passar, pede credenciais, ou rejeita.
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // CORS agora configurado aqui (Spring Security intercepta antes do MVC).
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF desabilitado: JWT é stateless (sem sessão), então CSRF não se aplica.
                // CSRF é relevante apenas para sessões baseadas em cookies de sessão.
                .csrf(AbstractHttpConfigurer::disable)

                // STATELESS: Spring Security não cria nem usa HttpSession.
                // Cada requisição se autentica pelo token JWT no header, independentemente.
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // Rotas públicas: qualquer um pode acessar
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-ui.html").permitAll()
                        // Webhooks: protegidos por assinatura HMAC, não por JWT
                        .requestMatchers("/api/webhooks/**").permitAll()

                        // Apenas ORGANIZADOR pode criar, atualizar e deletar eventos
                        .requestMatchers(HttpMethod.POST, "/api/events/**").hasRole("ORGANIZADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/events/**").hasRole("ORGANIZADOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/events/**").hasRole("ORGANIZADOR")

                        // Painel e validação de ingressos: exclusivos do organizador
                        .requestMatchers("/api/organizer/**").hasRole("ORGANIZADOR")
                        .requestMatchers(HttpMethod.POST, "/api/tickets/validate").hasRole("ORGANIZADOR")

                        // Qualquer outra rota exige autenticação
                        .anyRequest().authenticated()
                )

                // Handlers de erro: retornam JSON padronizado em vez de página HTML.
                .exceptionHandling(e -> e
                        // 401 Unauthorized: token ausente ou inválido
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(401);
                            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(res.getWriter(),
                                    new ErrorResponse("UNAUTHORIZED", "Autenticação necessária"));
                        })
                        // 403 Forbidden: autenticado, mas sem permissão para esta ação
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403);
                            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(res.getWriter(),
                                    new ErrorResponse("FORBIDDEN", "Acesso negado"));
                        })
                )

                // Adiciona nosso filtro JWT ANTES do filtro padrão de autenticação por usuário/senha.
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    // CORS: permite que o Angular (porta 4200) faça chamadas para o Spring (porta 8080).
    // Sem isso, o browser bloqueia as respostas do servidor por serem "origens cruzadas".
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // BCryptPasswordEncoder: algoritmo de hash seguro para senhas.
    // Nunca armazenamos a senha em texto puro — apenas o hash.
    // BCrypt inclui um "salt" aleatório, então o mesmo texto gera hashes diferentes a cada vez.
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // AuthenticationManager: orquestra o processo de autenticação (verificar email + senha).
    // Usado pelo AuthService.login() para validar as credenciais do usuário.
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
