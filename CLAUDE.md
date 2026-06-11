# TicketFlow — Convenções do Projeto

## Visão Geral
TicketFlow é uma plataforma de venda de ingressos com gateway de pagamento simulado.

- **Backend:** Java 21 + Spring Boot 3.x → pasta `backend/`
- **Frontend:** Angular 18+ (standalone) + Tailwind CSS → pasta `frontend/`
- **Banco:** PostgreSQL 16 (Docker local, Neon em produção)
- **Mensageria:** RabbitMQ 3.13 (Docker local, CloudAMQP em produção)

---

## Executando Localmente

### Pré-requisitos
- Java 21, Node 18+, Docker Desktop

### 1. Subir infraestrutura
```bash
docker compose up -d
```
- Postgres: `localhost:5432` (banco: `ticketflow`, user: `ticketflow_user`, pass: `ticketflow_pass`)
- RabbitMQ Management UI: http://localhost:15672

### 2. Subir backend
```bash
cd backend
./mvnw spring-boot:run
```
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html

### 3. Subir frontend
```bash
cd frontend
npm install
npm start
```
- App: http://localhost:4200

---

## Convenções do Backend

### Estrutura de Pacotes
```
com.ticketflow.backend
├── config/       → @Configuration beans (CORS, OpenAPI, Security)
├── controller/   → Recebe HTTP, delega ao service, retorna DTOs
├── dto/          → Java records: {Entity}RequestDto + {Entity}ResponseDto
├── entity/       → @Entity JPA, sem lógica de negócio
├── exception/    → Exceções customizadas + GlobalExceptionHandler
├── repository/   → Interfaces JpaRepository
└── service/      → Toda a lógica de negócio vive aqui
```

### Regras Obrigatórias
- **NUNCA** expor `@Entity` diretamente em respostas da API. Sempre usar DTOs.
- **NUNCA** usar `ddl-auto=create` ou `update`. Schema gerenciado exclusivamente pelo Flyway.
- Migrations seguem o padrão `V{n}__{descricao_snake_case}.sql`. Nunca editar um arquivo após executado.
- Usar `@Valid` em todos os `@RequestBody` para acionar validações dos DTOs.
- Respostas de erro sempre passam pelo `GlobalExceptionHandler` (formato `{ code, message }`).
- Injeção via construtor (nunca `@Autowired` em campo). Usar `@RequiredArgsConstructor` do Lombok.
- `@Transactional` fica no `@Service`, nunca no `@Repository`.

### Nomenclatura Java
| Item | Convenção | Exemplo |
|---|---|---|
| Classes | PascalCase | `EventService`, `EventController` |
| Métodos/campos | camelCase | `findAllEvents()`, `createdAt` |
| Constantes | UPPER_SNAKE_CASE | `MAX_TICKET_QUANTITY` |
| Tabelas DB | snake_case plural | `events`, `ticket_sectors` |
| Colunas DB | snake_case | `created_at`, `event_date` |
| DTOs | sufixo `Dto` | `EventRequestDto`, `EventResponseDto` |
| Migrations | `V{n}__{desc}.sql` | `V1__create_events_table.sql` |

### Padrão REST
```
GET    /api/events        → lista todos
GET    /api/events/{id}   → busca um
POST   /api/events        → cria
PUT    /api/events/{id}   → atualiza completo
DELETE /api/events/{id}   → remove
```

---

## Convenções do Frontend

### Estrutura de Pastas
```
src/app/
├── core/         → Serviços singleton, interceptors HTTP, guards de rota
├── shared/       → Componentes reutilizáveis (usados em 2+ features)
└── features/     → Uma pasta por domínio; cada feature tem seu *.routes.ts
```

### Regras Obrigatórias
- Todos os componentes **devem** ser `standalone: true`.
- Todas as rotas de feature usam lazy loading (`loadChildren` ou `loadComponent`).
- Nunca hardcodar URL da API. Usar sempre `environment.apiUrl`.
- Usar Angular Signals para estado local de componentes.
- Selectors com prefixo `app-` (ex.: `<app-navbar>`, `<app-events-list>`).

### Nomenclatura Angular
| Item | Convenção | Exemplo |
|---|---|---|
| Arquivo componente | kebab-case.component.ts | `events-list.component.ts` |
| Arquivo serviço | kebab-case.service.ts | `event.service.ts` |
| Interface/type | PascalCase | `EventResponse`, `CreateEventRequest` |
| Arquivo de rotas | feature.routes.ts | `events.routes.ts` |

---

## Banco de Dados
- PKs: `UUID` (gerado pelo Postgres via `gen_random_uuid()`)
- Timestamps: `TIMESTAMPTZ` (sempre UTC)
- Índice em toda coluna usada em `WHERE` ou `ORDER BY`

---

## Git
### Branches
- `feature/descricao-curta`
- `fix/descricao-curta`

### Commits (Conventional Commits)
```
feat: adiciona endpoint de listagem de eventos
fix: corrige expiração de reserva com fuso horário errado
chore: atualiza dependências do Maven
docs: adiciona diagrama de fluxo de pagamento
refactor: extrai lógica de validação para EventValidator
test: adiciona teste de concorrência para reserva de ingressos
```

### Nunca commitar
`.env`, `*.class`, `node_modules/`, `.idea/`, arquivos de IDE

---

## Status das Fases
- [x] Fase 1 — Fundação (monorepo, Docker, Event CRUD, Angular shell)
- [ ] Fase 2 — Autenticação e Eventos (JWT, papéis, CRUD completo, telas)
- [ ] Fase 3 — Reservas e Concorrência (lock pessimista, expiração, testes)
- [ ] Fase 4 — Gateway de Pagamento (RabbitMQ, idempotência, checkout)
- [ ] Fase 5 — Webhooks e Resiliência (HMAC, retry, DLQ)
- [ ] Fase 6 — Pós-compra e Painéis (QR code, dashboard)
- [ ] Fase 7 — Qualidade e Deploy (CI/CD, Render, Vercel, Neon)
