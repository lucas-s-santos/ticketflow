package com.canhoto.backend.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Envelope de paginação da API.
 *
 * <p>Não serializamos o {@code Page} do Spring Data diretamente: o JSON dele
 * carrega a estrutura interna ({@code pageable}, {@code sort}, {@code numberOfElements})
 * e o próprio Spring avisa que esse formato não é um contrato estável. Expor
 * aquilo amarraria os clientes a detalhes da biblioteca.
 *
 * <p>Aqui vai só o que um cliente precisa para desenhar a navegação.
 */
public record PageResponseDto<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {

    /** Converte a página de entidades em página de DTOs, aplicando o mapeador a cada item. */
    public static <E, T> PageResponseDto<T> of(Page<E> pagina, Function<E, T> mapeador) {
        return new PageResponseDto<>(
                pagina.getContent().stream().map(mapeador).toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages(),
                pagina.isLast()
        );
    }
}
