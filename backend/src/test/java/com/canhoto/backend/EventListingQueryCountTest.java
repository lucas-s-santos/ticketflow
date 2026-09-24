package com.canhoto.backend;

import com.canhoto.backend.dto.EventResponseDto;
import com.canhoto.backend.dto.PageResponseDto;
import com.canhoto.backend.service.EventService;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Trava o número de consultas da listagem de eventos.
 *
 * <p>A versão anterior montava a resposta buscando os setores de cada evento
 * separadamente: uma página de 12 eventos custava 13 idas ao banco. O problema
 * do N+1 é que ele não aparece em teste funcional nenhum — a resposta fica
 * correta, só lenta, e piora conforme o banco cresce. Por isso a garantia aqui
 * é sobre a quantidade de consultas, não sobre o conteúdo.
 *
 * <p>Esperado: uma consulta de contagem (exigida pela paginação), uma dos
 * eventos e uma dos setores de todos eles.
 */
class EventListingQueryCountTest extends IntegrationTest {

    private static final int CONSULTAS_ESPERADAS = 3;

    @Autowired private EventService eventService;
    @Autowired private EntityManagerFactory entityManagerFactory;

    @Test
    void listagem_nao_dispara_uma_consulta_por_evento() {
        Statistics estatisticas = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        estatisticas.setStatisticsEnabled(true);
        estatisticas.clear();

        PageResponseDto<EventResponseDto> pagina =
                eventService.findAll(null, null, null, false, PageRequest.of(0, 12, Sort.by("date")));

        long consultas = estatisticas.getPrepareStatementCount();

        assertThat(pagina.content())
                .as("a seed da V7 precisa ter populado eventos, senão o teste não prova nada")
                .isNotEmpty();
        assertThat(pagina.content())
                .as("os setores precisam vir montados junto, não vazios")
                .anyMatch(evento -> !evento.sectors().isEmpty());

        assertThat(consultas)
                .as("%d evento(s) na página não podem custar %d consultas — isso é N+1",
                        pagina.content().size(), consultas)
                .isLessThanOrEqualTo(CONSULTAS_ESPERADAS);
    }
}
