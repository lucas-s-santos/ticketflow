-- V7__seed_demo_data.sql
-- Dados de demonstração: sem isto, quem abre o link público vê uma lista vazia
-- e não tem como avaliar nada sem antes se cadastrar.
--
-- Dois usuários com senha "demo123" (hash BCrypt, custo 10):
--   organizador@demo.com  -> ORGANIZADOR (cria eventos, dashboard, check-in)
--   cliente@demo.com      -> CLIENTE     (reserva, paga, recebe o QR code)
--
-- Os UUIDs são fixos para que a migration seja reexecutável em um banco limpo e para
-- que os setores possam referenciar os eventos sem subquery.
-- ON CONFLICT DO NOTHING: se o email ou o id já existirem, a migration não quebra.
--
-- As datas são relativas ao momento em que a migration roda, então os eventos nascem
-- sempre no futuro, independentemente de quando o deploy acontecer. O date_trunc zera
-- para a meia-noite do dia antes de somar a hora: sem ele, todo evento herdaria o
-- minuto exato em que a migration rodou e a lista inteira apareceria no mesmo horário
-- quebrado (jogo de futebol às 23h39), que é a marca registrada de dado inventado.

INSERT INTO users (id, name, email, password_hash, role) VALUES
    ('a0000000-0000-4000-8000-000000000001',
     'Ana Organizadora',
     'organizador@demo.com',
     '$2b$10$ffn6j9xdNqLe/52lwfcmeOeL6MoYWjry9TSWpk1WDIv78bvoza5hy',
     'ORGANIZADOR'),
    ('a0000000-0000-4000-8000-000000000002',
     'Caio Cliente',
     'cliente@demo.com',
     '$2b$10$ffn6j9xdNqLe/52lwfcmeOeL6MoYWjry9TSWpk1WDIv78bvoza5hy',
     'CLIENTE')
ON CONFLICT DO NOTHING;

INSERT INTO events (id, name, description, date, location, owner_id) VALUES
    ('e0000000-0000-4000-8000-000000000001',
     'Festival Aurora — Edição Verão',
     'Dois palcos, quinze atrações e um pôr do sol que já virou tradição. Portões às 14h.',
     date_trunc('day', NOW() + INTERVAL '30 days') + INTERVAL '14 hours',
     'Arena Vila Nova — São Paulo, SP',
     'a0000000-0000-4000-8000-000000000001'),

    ('e0000000-0000-4000-8000-000000000002',
     'Noite de Jazz na Serra',
     'Quarteto residente e convidados, em formato intimista. Mesas para quatro pessoas.',
     date_trunc('day', NOW() + INTERVAL '45 days') + INTERVAL '21 hours',
     'Casa de Cultura — Tiradentes, MG',
     'a0000000-0000-4000-8000-000000000001'),

    ('e0000000-0000-4000-8000-000000000003',
     'Stand-Up: Sessão Dupla',
     'Duas horas de comédia com dois humoristas em cartaz. Classificação 16 anos.',
     date_trunc('day', NOW() + INTERVAL '12 days') + INTERVAL '21 hours 30 minutes',
     'Teatro Central — Rio de Janeiro, RJ',
     'a0000000-0000-4000-8000-000000000001'),

    ('e0000000-0000-4000-8000-000000000004',
     'Dev Summit Brasil',
     'Conferência de engenharia de software: arquitetura distribuída, dados e plataforma. Coffee break incluso.',
     date_trunc('day', NOW() + INTERVAL '60 days') + INTERVAL '9 hours',
     'Expo Norte — São Paulo, SP',
     'a0000000-0000-4000-8000-000000000001'),

    ('e0000000-0000-4000-8000-000000000005',
     'Clássico Municipal — Final',
     'Jogo decisivo do campeonato regional. Abertura dos portões duas horas antes.',
     date_trunc('day', NOW() + INTERVAL '7 days') + INTERVAL '16 hours',
     'Estádio Municipal — Belo Horizonte, MG',
     'a0000000-0000-4000-8000-000000000001'),

    ('e0000000-0000-4000-8000-000000000006',
     'Mostra de Teatro Contemporâneo',
     'Cinco montagens independentes ao longo de um fim de semana. Ingresso válido para todas as sessões.',
     date_trunc('day', NOW() + INTERVAL '21 days') + INTERVAL '20 hours',
     'Teatro Apolo — Recife, PE',
     'a0000000-0000-4000-8000-000000000001')
ON CONFLICT DO NOTHING;

-- available_seats abaixo de capacity representa ingressos já vendidos antes da demo.
-- Isso deixa a tela viva: aparecem setores quase cheios e um esgotado (Pista Premium
-- do Festival Aurora), que é o caso que exercita o badge "Esgotado" e o bloqueio de reserva.
INSERT INTO ticket_sectors (id, event_id, name, capacity, available_seats, price) VALUES
    -- Festival Aurora
    ('c0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Pista',          2000, 1340,  180.00),
    ('c0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Pista Premium',   500,    0,  340.00),
    ('c0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'Camarote',        150,   38,  790.00),

    -- Noite de Jazz
    ('c0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002', 'Mesa (4 lugares)', 40,   11,  320.00),
    ('c0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002', 'Plateia',         120,   87,   95.00),

    -- Stand-Up
    ('c0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000003', 'Plateia Baixa',   180,   42,  120.00),
    ('c0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000003', 'Plateia Alta',    220,  165,   70.00),

    -- Dev Summit
    ('c0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000004', 'Inteira',         600,  418,  450.00),
    ('c0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000004', 'Estudante',       200,   56,  180.00),
    ('c0000000-0000-4000-8000-00000000000a', 'e0000000-0000-4000-8000-000000000004', 'Workshop + Palestras', 80, 23, 890.00),

    -- Clássico Municipal
    ('c0000000-0000-4000-8000-00000000000b', 'e0000000-0000-4000-8000-000000000005', 'Arquibancada',   8000, 5210,   60.00),
    ('c0000000-0000-4000-8000-00000000000c', 'e0000000-0000-4000-8000-000000000005', 'Cadeira Coberta', 1200,  340,  140.00),

    -- Mostra de Teatro
    ('c0000000-0000-4000-8000-00000000000d', 'e0000000-0000-4000-8000-000000000006', 'Passaporte',      300,  214,  110.00),
    ('c0000000-0000-4000-8000-00000000000e', 'e0000000-0000-4000-8000-000000000006', 'Sessão Avulsa',   300,  276,   35.00)
ON CONFLICT DO NOTHING;
