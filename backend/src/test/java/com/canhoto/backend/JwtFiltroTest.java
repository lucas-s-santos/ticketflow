package com.canhoto.backend;

import com.canhoto.backend.entity.Role;
import com.canhoto.backend.entity.User;
import com.canhoto.backend.repository.UserRepository;
import com.canhoto.backend.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.security.SecureRandom;
import java.util.Date;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Token ruim no header não pode derrubar a requisição.
 *
 * <p>O caso que motivou o teste: quem volta ao site depois de 24 h ainda tem o
 * token vencido no navegador, e o front o manda em toda chamada. O filtro
 * deixava a exceção do JJWT subir, e a lista pública de eventos — que não
 * precisa de login nenhum — falhava.
 *
 * <p>A regra: token que não vale é como token nenhum. Rota pública responde;
 * rota protegida responde 401, que é o sinal para o front derrubar a sessão.
 */
@AutoConfigureMockMvc
class JwtFiltroTest extends IntegrationTest {

    private static final String CLIENTE_DEMO = "cliente@demo.com";

    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwtService;
    @Autowired private UserRepository userRepository;

    @Value("${app.security.jwt.secret-key}")
    private String segredo;

    private String tokenVencido() {
        long agora = System.currentTimeMillis();
        return Jwts.builder()
                .subject(CLIENTE_DEMO)
                .issuedAt(new Date(agora - 2 * 86_400_000L))
                .expiration(new Date(agora - 86_400_000L))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(segredo)), Jwts.SIG.HS256)
                .compact();
    }

    private String tokenDeOutraChave() {
        byte[] outraChave = new byte[32];
        new SecureRandom().nextBytes(outraChave);
        return Jwts.builder()
                .subject(CLIENTE_DEMO)
                .expiration(new Date(System.currentTimeMillis() + 3_600_000L))
                .signWith(Keys.hmacShaKeyFor(outraChave), Jwts.SIG.HS256)
                .compact();
    }

    /** Assinado com a chave certa, mas a conta não existe (foi apagada, por exemplo). */
    private String tokenDeContaInexistente() {
        User fantasma = new User();
        fantasma.setEmail("ninguem-" + UUID.randomUUID() + "@canhoto.test");
        fantasma.setRole(Role.CLIENTE);
        return jwtService.generateToken(fantasma);
    }

    private String tokenValido() {
        return jwtService.generateToken(userRepository.findByEmail(CLIENTE_DEMO).orElseThrow());
    }

    @Test
    void rota_publica_ignora_token_vencido() throws Exception {
        mvc.perform(get("/api/events").header("Authorization", "Bearer " + tokenVencido()))
                .andExpect(status().isOk());
    }

    @Test
    void rota_publica_ignora_token_malformado() throws Exception {
        mvc.perform(get("/api/events").header("Authorization", "Bearer isto-nao-e-um-jwt"))
                .andExpect(status().isOk());
    }

    @Test
    void rota_protegida_com_token_vencido_responde_401() throws Exception {
        mvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + tokenVencido()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void token_assinado_com_outra_chave_responde_401() throws Exception {
        mvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + tokenDeOutraChave()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void token_de_conta_inexistente_responde_401() throws Exception {
        mvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + tokenDeContaInexistente()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void token_valido_continua_entrando() throws Exception {
        mvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + tokenValido()))
                .andExpect(status().isOk());
    }
}
