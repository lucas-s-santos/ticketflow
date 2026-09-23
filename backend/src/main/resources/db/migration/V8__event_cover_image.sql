-- V8__event_cover_image.sql
-- Imagem de capa do evento.
--
-- Guardamos a URL, não o arquivo. Dois motivos:
--   1. O disco do Render (plano free) é efêmero: arquivo salvo localmente some
--      a cada deploy. Upload de verdade exige um serviço externo (S3, Cloudinary).
--   2. A coluna serve para os dois casos — se um upload for plugado depois, ele
--      grava a URL devolvida pelo serviço aqui, sem mudar schema nem contrato.
--
-- VARCHAR(1000): URLs de CDN com parâmetros de transformação passam fácil dos 255.
ALTER TABLE events ADD COLUMN cover_image_url VARCHAR(1000);

-- Capas para os eventos de demonstração da V7.
-- As URLs foram verificadas uma a uma (HTTP 200 + content-type de imagem) e o
-- conteúdo conferido visualmente, para não cair foto de show num jogo de futebol.
UPDATE events SET cover_image_url =
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80&auto=format&fit=crop'
    WHERE id = 'e0000000-0000-4000-8000-000000000001';  -- Festival Aurora: palco e multidão

UPDATE events SET cover_image_url =
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1400&q=80&auto=format&fit=crop'
    WHERE id = 'e0000000-0000-4000-8000-000000000002';  -- Noite de Jazz: microfone vintage

UPDATE events SET cover_image_url =
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1400&q=80&auto=format&fit=crop'
    WHERE id = 'e0000000-0000-4000-8000-000000000003';  -- Stand-Up: cortina vermelha

UPDATE events SET cover_image_url =
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1400&q=80&auto=format&fit=crop'
    WHERE id = 'e0000000-0000-4000-8000-000000000004';  -- Dev Summit: palestra e plateia

UPDATE events SET cover_image_url =
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1400&q=80&auto=format&fit=crop'
    WHERE id = 'e0000000-0000-4000-8000-000000000005';  -- Clássico: campo sob refletores

UPDATE events SET cover_image_url =
    'https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=1400&q=80&auto=format&fit=crop'
    WHERE id = 'e0000000-0000-4000-8000-000000000006';  -- Mostra de Teatro: plateia vazia
