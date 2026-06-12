# 🎟️ TicketFlow

Plataforma de venda de ingressos para eventos, com gateway de pagamento simulado, construída para demonstrar conceitos de engenharia de software em um cenário realista: **autenticação JWT**, **controle de concorrência com lock pessimista**, e **processamento de pagamento assíncrono com mensageria e idempotência**.

> Projeto de portfólio em construção incremental por fases. Atualmente nas **Fases 1–4 de 7**.

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| **Backend** | Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA, Spring AMQP |
| **Frontend** | Angular 18 (standalone components + Signals), Tailwind CSS |
| **Banco** | PostgreSQL 16 (schema versionado com Flyway) |
| **Mensageria** | RabbitMQ 3.13 |
| **Auth** | JWT (JJWT), BCrypt, autorização por papéis |
| **Infra local** | Docker Compose |

---

## 🏗️ Arquitetura

```
┌─────────────┐   HTTP/JSON   ┌──────────────┐   JDBC   ┌──────────────┐
│  Angular    │ ────────────▶ │ Spring Boot  │ ───────▶ │ PostgreSQL   │
│ (porta 4200)│ ◀──────────── │ (porta 8080) │ ◀─────── │ (porta 5432) │
└─────────────┘   JWT Bearer  └──────┬───────┘          └──────────────┘
                                     │ AMQP
                                     ▼
                              ┌──────────────┐
                              │  RabbitMQ    │  ← gateway de pagamento
                              │ (porta 5672) │    processado em background
                              └──────────────┘
```

O backend segue arquitetura em camadas: `controller` → `service` → `repository`, com DTOs (Java records) isolando as entidades JPA da API pública.

---

## 🚀 Rodando localmente

### Pré-requisitos
- Java 21, Node 18+, Docker Desktop

### 1. Subir a infraestrutura
```bash
docker compose up -d
```
- PostgreSQL: `localhost:5432` (banco `ticketflow`)
- RabbitMQ Management UI: http://localhost:15672

### 2. Backend
```bash
cd backend
./mvnw spring-boot:run
```
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
- App: http://localhost:4200

---

## 📦 Fases do Projeto

- [x] **Fase 1 — Fundação:** monorepo, Docker, CRUD de eventos, shell Angular
- [x] **Fase 2 — Autenticação:** JWT, papéis (ORGANIZADOR/CLIENTE), setores de ingressos, telas de login/cadastro
- [x] **Fase 3 — Reservas e Concorrência:** lock pessimista (`SELECT ... FOR UPDATE`) contra sobrevenda, expiração automática de reservas, teste de concorrência com 20 threads
- [x] **Fase 4 — Gateway de Pagamento:** checkout assíncrono via RabbitMQ, idempotência (`Idempotency-Key`), confirmação de reserva
- [ ] **Fase 5 — Webhooks e Resiliência:** HMAC, retry, dead-letter queue
- [ ] **Fase 6 — Pós-compra e Painéis:** QR code, dashboard do organizador
- [ ] **Fase 7 — Qualidade e Deploy:** CI/CD, Render, Vercel, Neon

---

## 💡 Destaques de Engenharia

- **Concorrência segura:** o decremento de assentos usa lock pessimista no PostgreSQL. Um teste de integração dispara 20 threads simultâneas disputando 5 vagas e verifica que exatamente 5 reservas são criadas — provando que não há sobrevenda.
- **Pagamento assíncrono:** o checkout responde imediatamente (`PROCESSING`) e publica uma mensagem no RabbitMQ; um consumidor processa o pagamento em background, desacoplando a operação lenta da requisição HTTP.
- **Idempotência:** uma `Idempotency-Key` (com constraint `UNIQUE` no banco) garante que reenviar o mesmo checkout — por clique duplo ou retry de rede — nunca gera cobrança duplicada.
- **Schema versionado:** todo o banco é gerenciado por migrations Flyway; o Hibernate roda em modo `validate` e nunca altera o schema.

---

## 📄 Licença

Projeto de estudo/portfólio.
