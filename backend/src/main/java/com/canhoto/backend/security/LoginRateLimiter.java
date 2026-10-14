package com.canhoto.backend.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita tentativas de autenticação por origem.
 *
 * <p>Sem isto, {@code POST /api/auth/login} aceita força bruta indefinidamente:
 * o BCrypt encarece cada tentativa, mas não impede milhares delas.
 *
 * <p>Implementado como token bucket em memória. Não usamos Bucket4j porque o
 * algoritmo cabe em poucas linhas e o ponto que realmente exige cuidado — não
 * acumular um registro por IP para sempre — fica visível aqui em vez de
 * escondido atrás de uma API. Num deploy com mais de uma instância isto deixa
 * de valer: cada instância teria a própria contagem, e o teto real viraria o
 * limite multiplicado pelo número de réplicas. Nesse cenário o caminho é mover
 * os buckets para Redis.
 */
@Slf4j
@Component
public class LoginRateLimiter {

    /** Quanto tempo um bucket ocioso sobrevive antes de ser varrido. */
    private static final Duration OCIOSIDADE_MAXIMA = Duration.ofMinutes(30);

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private final int capacidade;
    private final long janelaNanos;

    public LoginRateLimiter(
            @Value("${app.security.rate-limit.login.max-attempts}") int capacidade,
            @Value("${app.security.rate-limit.login.window-seconds}") long janelaSegundos) {
        this.capacidade = capacidade;
        this.janelaNanos = Duration.ofSeconds(janelaSegundos).toNanos();
    }

    /** @return true se a tentativa pode seguir; false se a origem estourou o limite. */
    public boolean permitir(String origem) {
        return buckets
                .computeIfAbsent(origem, chave -> new Bucket(capacidade, janelaNanos))
                .consumir();
    }

    /** Zera o consumo de uma origem. Chamado quando o login dá certo. */
    public void liberar(String origem) {
        buckets.remove(origem);
    }

    /**
     * Remove buckets parados. Um mapa indexado por IP cresce para sempre num
     * serviço público: cada scanner que bate uma vez no login deixaria uma
     * entrada permanente, e o processo acabaria morrendo de OutOfMemory.
     */
    @Scheduled(fixedRate = 10 * 60 * 1000)
    void varrerOciosos() {
        long corte = System.nanoTime() - OCIOSIDADE_MAXIMA.toNanos();
        int antes = buckets.size();
        buckets.values().removeIf(bucket -> bucket.ociosoDesde(corte));
        int removidos = antes - buckets.size();
        if (removidos > 0) {
            log.debug("Rate limit: {} bucket(s) ocioso(s) removido(s), {} em uso", removidos, buckets.size());
        }
    }

    /**
     * Token bucket com recarga preguiçosa: em vez de um temporizador por origem,
     * calculamos quantos tokens teriam sido repostos desde a última consulta.
     */
    private static final class Bucket {

        private final int capacidade;
        private final double tokensPorNano;

        private double tokens;
        private long ultimoAcesso;

        Bucket(int capacidade, long janelaNanos) {
            this.capacidade = capacidade;
            this.tokensPorNano = (double) capacidade / janelaNanos;
            this.tokens = capacidade;
            this.ultimoAcesso = System.nanoTime();
        }

        synchronized boolean consumir() {
            recarregar();
            if (tokens < 1.0) {
                return false;
            }
            tokens -= 1.0;
            return true;
        }

        synchronized boolean ociosoDesde(long corte) {
            return ultimoAcesso < corte;
        }

        private void recarregar() {
            long agora = System.nanoTime();
            double repostos = (agora - ultimoAcesso) * tokensPorNano;
            this.tokens = Math.min(capacidade, tokens + repostos);
            this.ultimoAcesso = agora;
        }
    }
}
