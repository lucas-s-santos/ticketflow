package com.canhoto.backend.repository;

import com.canhoto.backend.entity.Event;
import com.canhoto.backend.entity.TicketSector;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Filtros da listagem pública de eventos.
 *
 * <p>Usa Criteria em vez de uma JPQL com {@code (:param IS NULL OR ...)} para
 * cada filtro: aquele padrão gera uma consulta cheia de condições inertes, que
 * o planejador ainda precisa avaliar, e depende de o Hibernate inferir o tipo
 * de um parâmetro nulo — o que falha de formas pouco óbvias. Aqui cada filtro
 * ausente simplesmente não entra na consulta.
 */
public final class EventSpecifications {

    private EventSpecifications() {
    }

    public static Specification<Event> comFiltros(
            String texto,
            OffsetDateTime de,
            OffsetDateTime ate,
            boolean apenasComVagas) {

        return (root, query, cb) -> {
            List<Predicate> condicoes = new ArrayList<>();

            if (texto != null && !texto.isBlank()) {
                String termo = "%" + semAcento(texto.trim().toLowerCase()) + "%";
                condicoes.add(cb.or(
                        curinga(cb, root, "name", termo),
                        curinga(cb, root, "location", termo),
                        curinga(cb, root, "description", termo)));
            }

            if (de != null) {
                condicoes.add(cb.greaterThanOrEqualTo(root.get("date"), de));
            }
            if (ate != null) {
                condicoes.add(cb.lessThanOrEqualTo(root.get("date"), ate));
            }

            if (apenasComVagas) {
                // EXISTS em vez de JOIN: com join, um evento com tres setores
                // disponiveis apareceria tres vezes na listagem.
                assert query != null;
                Subquery<Long> temVaga = query.subquery(Long.class);
                Root<TicketSector> setor = temVaga.from(TicketSector.class);
                temVaga.select(cb.literal(1L)).where(
                        cb.equal(setor.get("event"), root),
                        cb.greaterThan(setor.get("availableSeats"), 0));
                condicoes.add(cb.exists(temVaga));
            }

            return condicoes.isEmpty() ? cb.conjunction() : cb.and(condicoes.toArray(new Predicate[0]));
        };
    }

    /**
     * Compara o campo sem acento e em minúsculas. O termo chega já normalizado
     * do lado Java; a coluna é normalizada pelo Postgres na hora da comparação.
     */
    private static Predicate curinga(
            jakarta.persistence.criteria.CriteriaBuilder cb,
            Root<Event> root,
            String campo,
            String termo) {
        Expression<String> normalizado =
                cb.function("unaccent", String.class, cb.lower(root.get(campo)));
        return cb.like(normalizado, termo);
    }

    /**
     * Remove acentos no lado Java, para o termo buscado chegar na mesma forma
     * que o {@code unaccent} produz no banco. NFD separa a letra do acento e o
     * replace descarta as marcas diacríticas.
     */
    private static String semAcento(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }
}
