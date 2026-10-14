package com.canhoto.backend;

import com.canhoto.backend.dto.EventResponseDto;
import com.canhoto.backend.dto.PageResponseDto;
import com.canhoto.backend.service.EventService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Busca e filtros da listagem pública, sobre os dados de demonstração da V7.
 *
 * <p>O caso que mais importa aqui é o do acento: quem busca no celular digita
 * "classico", não "Clássico". Sem o {@code unaccent} dos dois lados da
 * comparação, a busca simplesmente não encontra nada e parece quebrada.
 */
class EventSearchTest extends IntegrationTest {

    private static final Pageable PRIMEIRA_PAGINA = PageRequest.of(0, 20, Sort.by("date"));

    @Autowired private EventService eventService;

    private List<String> buscar(String texto) {
        return nomes(eventService.findAll(texto, null, null, false, PRIMEIRA_PAGINA));
    }

    private List<String> nomes(PageResponseDto<EventResponseDto> pagina) {
        return pagina.content().stream().map(EventResponseDto::name).toList();
    }

    @Test
    void encontra_pelo_nome() {
        assertThat(buscar("jazz"))
                .anySatisfy(nome -> assertThat(nome).contains("Jazz"));
    }

    @Test
    void ignora_acento_na_busca() {
        assertThat(buscar("classico"))
                .as("quem digita sem acento precisa achar \"Clássico\"")
                .anySatisfy(nome -> assertThat(nome).contains("Clássico"));

        assertThat(buscar("sessao"))
                .as("mesmo caso para \"Sessão\"")
                .anySatisfy(nome -> assertThat(nome).contains("Sessão"));
    }

    @Test
    void encontra_mesmo_com_o_termo_acentuado() {
        // O oposto do teste acima: quem copia e cola o nome, ou digita com
        // teclado que poe acento, tambem precisa achar.
        assertThat(buscar("Clássico"))
                .anySatisfy(nome -> assertThat(nome).contains("Clássico"));
        assertThat(buscar("Sessão"))
                .anySatisfy(nome -> assertThat(nome).contains("Sessão"));
        assertThat(buscar("CLÁSSICO"))
                .as("acento junto com caixa alta")
                .anySatisfy(nome -> assertThat(nome).contains("Clássico"));
    }

    @Test
    void ignora_caixa_na_busca() {
        assertThat(buscar("DEV SUMMIT")).isEqualTo(buscar("dev summit"));
        assertThat(buscar("DEV SUMMIT")).isNotEmpty();
    }

    @Test
    void encontra_pelo_local() {
        assertThat(buscar("recife"))
                .as("o local tambem entra na busca, o que cobre busca por cidade")
                .isNotEmpty();
    }

    @Test
    void texto_vazio_nao_filtra_nada() {
        int semFiltro = eventService.findAll(null, null, null, false, PRIMEIRA_PAGINA).content().size();
        int comVazio = eventService.findAll("   ", null, null, false, PRIMEIRA_PAGINA).content().size();

        assertThat(comVazio)
                .as("espaco em branco nao pode ser tratado como termo de busca")
                .isEqualTo(semFiltro);
    }

    @Test
    void termo_inexistente_devolve_pagina_vazia() {
        PageResponseDto<EventResponseDto> pagina =
                eventService.findAll("xyzinexistente", null, null, false, PRIMEIRA_PAGINA);

        assertThat(pagina.content()).isEmpty();
        assertThat(pagina.totalElements())
                .as("a contagem tambem precisa respeitar o filtro")
                .isZero();
    }

    @Test
    void filtra_por_periodo() {
        OffsetDateTime daquiA20Dias = OffsetDateTime.now().plusDays(20);

        PageResponseDto<EventResponseDto> adiante =
                eventService.findAll(null, daquiA20Dias, null, false, PRIMEIRA_PAGINA);

        assertThat(adiante.content())
                .isNotEmpty()
                .allSatisfy(evento -> assertThat(evento.date()).isAfterOrEqualTo(daquiA20Dias));
    }

    @Test
    void com_vagas_esconde_evento_sem_nenhum_setor_disponivel() {
        // A seed deixa a Pista Premium do Festival Aurora esgotada, mas os outros
        // setores do mesmo evento continuam com vaga: ele deve seguir aparecendo.
        assertThat(nomes(eventService.findAll(null, null, null, true, PRIMEIRA_PAGINA)))
                .as("evento com pelo menos um setor disponivel nao pode sumir da listagem")
                .anySatisfy(nome -> assertThat(nome).contains("Aurora"));
    }

    @Test
    void nao_duplica_evento_que_tem_varios_setores_livres() {
        List<String> comVagas = nomes(eventService.findAll(null, null, null, true, PRIMEIRA_PAGINA));

        assertThat(comVagas)
                .as("o filtro usa EXISTS; com JOIN, um evento de tres setores livres apareceria tres vezes")
                .doesNotHaveDuplicates();
    }
}
