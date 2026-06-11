package com.ticketflow.backend.security;

import com.ticketflow.backend.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

// JwtService: responsável por GERAR e VALIDAR JSON Web Tokens.
// Um JWT tem três partes separadas por '.': Header.Payload.Signature
//   Header: algoritmo usado (HS256)
//   Payload: dados públicos — "sub" (email), "role", "iat" (emitido em), "exp" (expira em)
//   Signature: HMAC assinado com a chave secreta — garante que o token não foi adulterado
@Service
public class JwtService {

    @Value("${app.security.jwt.secret-key}")
    private String secretKey;

    @Value("${app.security.jwt.expiration-ms}")
    private long expirationMs;

    public String generateToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail())           // quem é o usuário
                .claim("role", user.getRole().name()) // dado extra no payload
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())           // assina com HMAC-SHA256
                .compact();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, String email) {
        try {
            String tokenEmail = extractEmail(token);
            return tokenEmail.equals(email) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }

    private Claims parseClaims(String token) {
        // parseSignedClaims lança exceção se o token for inválido ou expirado.
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        // A chave deve ser Base64 e ter pelo menos 256 bits para HMAC-SHA256.
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
