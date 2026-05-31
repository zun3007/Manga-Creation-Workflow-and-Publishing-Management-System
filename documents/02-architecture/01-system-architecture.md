# System Architecture

A monorepo-based internal manga-studio production & publishing management tool. Digitizes the full editorial pipeline from series proposal → board approval → chapter authoring → task assignment → submission review → publishing → voting → ranking → decision-making, with RBAC (5 roles), notifications, audit trails, and an in-browser Studio with optional on-device AI assists (YOLO panel detection, MobileSAM smart select, DeOldify colorization—all inference in-browser for privacy).

**Table of Contents**
1. System context
2. Monorepo layout
3. Container view
4. Backend component view
5. Frontend architecture
6. Studio & on-device AI architecture
7. Request lifecycle
8. Build, run & deploy

---

## 1. System Context

```mermaid
graph TB
    Users["👥 Five Roles<br/>MANGAKA | ASSISTANT<br/>TANTOU_EDITOR | EDITORIAL_BOARD | ADMIN"]
    Web["🌐 Web SPA<br/>React 19 + Vite 8<br/>Tailwind v4 theme<br/>Studio canvas"]
    API["⚙️ NestJS 11 API<br/>Module-per-domain<br/>JWT auth<br/>MySQL raw SQL"]
    MySQL["🗄️ MySQL 8<br/>29 tables<br/>State machines<br/>Docker :3308"]
    Uploads["📁 Static /uploads/<br/>Page images<br/>Submission files<br/>Served by API"]
    AIOnnx["🤖 ONNX Runtime Web<br/>YOLO | SAM | Colorize<br/>Web workers<br/>Lazy loaded"]
    
    Users -->|HTTP GET/POST/PATCH| Web
    Web -->|axios Bearer /api| API
    Web -->|Static /uploads| Uploads
    API -->|Query raw SQL<br/>Transactions| MySQL
    Uploads -->|Image URL| Web
    Web -->|In-browser inference| AIOnnx
    AIOnnx -->|heuristic fallback| Web
    
    style Web fill:#e1f5ff
    style API fill:#fff3e0
    style MySQL fill:#f3e5f5
    style AIOnnx fill:#e8f5e9
```

**Flow narrative:**
- Five roles authenticate via JWT (email/password or Google OAuth) and land on a per-role dashboard.
- Each role interacts with a single web SPA whose UI theme switches via `data-role` CSS scoping (no code duplication).
- The web frontend proxies `/api/*` to the NestJS backend (Vite dev proxy; production: separate origins with CORS).
- The API module-per-domain pattern enforces single responsibility: auth guards (JWT + RolesGuard) sit at the controller layer; services delegate to DbService for normalized raw SQL; notifications cross-cut all domain events.
- MySQL (Docker on host :3308 → container :3306) holds 29 tables grouped by concern: users & profiles, series lifecycle, chapters/pages/regions, tasks/submissions, annotations, voting/ranking/decisions, earnings/disputes, and cross-cutting audit/notifications.
- Static `/uploads/` folder served by the API stores raster images and submission files; in production, this moves to object storage (S3/GCS) behind a CDN.
- The Studio (a full-screen raster drawing app within the web SPA) supports on-device AI assists using ONNX Runtime Web—all inference runs in-browser; a heuristic fallback ensures the tool is always usable even if models fail to load.

---

## 2. Monorepo Layout

```
Manga-Creation-Workflow-and-Publishing-Management-System/
├── apps/
│   ├── api/                    # NestJS 11 backend
│   │   ├── src/
│   │   │   ├── app.module.ts   # 26 domain modules imported
│   │   │   ├── main.ts         # Bootstrap: prefix /api, CORS, validation pipe, static /uploads/
│   │   │   ├── auth/           # AuthModule, JwtStrategy, login/register/Google
│   │   │   ├── users/          # UsersModule, profile queries
│   │   │   ├── proposals/       # ProposalsModule, MANGAKA submit, BOARD decide
│   │   │   ├── series/         # SeriesModule, editor assignment, status
│   │   │   ├── chapters/       # ChaptersModule, lifecycle, editor review
│   │   │   ├── pages/          # PagesModule, page versioning
│   │   │   ├── regions/        # RegionsModule, panel/bubble metadata
│   │   │   ├── tasks/          # TasksModule, auto-pricing, assignment
│   │   │   ├── submissions/    # SubmissionsModule, assistant work review
│   │   │   ├── annotations/    # AnnotationsModule, editorial feedback
│   │   │   ├── studio/         # StudioModule, canvas doc persistence
│   │   │   ├── rankings/       # RankingsModule, voting, scoring, decisions
│   │   │   ├── decisions/      # DecisionsModule, continue/cancel/hiatus
│   │   │   ├── earnings/       # EarningsModule, accrual tracking
│   │   │   ├── disputes/       # DisputesModule, payment disputes
│   │   │   ├── notifications/  # NotificationsService (cross-cut)
│   │   │   ├── dashboard/      # DashboardModule, role-aware summary
│   │   │   ├── admin/          # AdminModule, user/audit management
│   │   │   ├── genres/         # GenresModule, enum-like lookup
│   │   │   ├── uploads/        # UploadsModule, Multer file handling
│   │   │   ├── seed/           # SeedModule, database population
│   │   │   └── db/             # DbModule, MySQL connection + DbService (query/insert)
│   │   └── test/               # Jest spec files
│   └── package.json
│
├── apps/web/                   # React 19 + Vite 8 frontend
│   ├── src/
│   │   ├── App.tsx             # Router: /login, /auth/callback, then <Protected><AppShell>
│   │   ├── components/
│   │   │   ├── app/            # AppShell, Header, SideNav (role-aware)
│   │   │   └── ui/             # Token-driven UI components (no role duplication)
│   │   ├── lib/
│   │   │   ├── api.ts          # axios client + Bearer token
│   │   │   ├── auth.tsx        # useAuth() hook, JWT context
│   │   │   └── studio/         # Studio modules: document, tools, ai/, panels, etc.
│   │   ├── pages/              # Role-based folders: /mangaka, /assistant, /editor, /board, /admin, /studio
│   │   │   ├── mangaka/        # /proposals, /series, /review
│   │   │   ├── assistant/      # /my-tasks, /earnings
│   │   │   ├── editor/         # /editor/review
│   │   │   ├── board/          # /board/proposals, /board/series, /board/rankings
│   │   │   ├── admin/          # /admin (console), /admin/disputes
│   │   │   ├── studio/         # /studio/page/:pageId, /studio/region/:taskId
│   │   │   └── shared/         # /login, /dashboard, /NotFound
│   │   └── styles/             # Tailwind config (role theming via data-role)
│   ├── vite.config.ts          # Proxy /api + /uploads to :3000; @manga/shared alias
│   └── package.json
│
├── packages/
│   ├── shared/                 # Single source of truth for types
│   │   ├── src/
│   │   │   ├── index.ts        # Barrel export
│   │   │   ├── enums/          # Role, status enums (PROPOSAL, CHAPTER, PAGE, TASK, SUBMISSION, EARNING_DISPUTE)
│   │   │   ├── transitions.ts  # State machine validators: canTransition(map, from, to)
│   │   │   └── dto/            # Shared DTO shapes (if any)
│   │   ├── package.json
│   │   └── tsconfig.json       # TypeScript config (no enums, import type, erasable syntax)
│   │
│   └── canvas-wasm/            # AssemblyScript → WASM
│       ├── src/
│       │   └── index.ts        # Pixel-level raster ops (brush fill, selection)
│       ├── wasm/               # Compiled .wasm binaries
│       └── package.json
│
├── db/                         # Database layer
│   ├── 01-schema.sql           # 29 tables: users, series, chapters, tasks, submissions, etc.
│   └── docker-compose.yml      # MySQL 8, port 3308
│
└── docs/                       # Documentation
    ├── superpowers/
    │   ├── DOC-BUILD-BRIEF.md  # Canonical ground truth (this file sources from it)
    │   └── smoke-sprint*.mjs    # Live end-to-end smoke tests
    └── architecture.md          # [STALE] do not read; this doc replaces it
```

**Workspace build order:**
1. `pnpm -F @manga/shared build` compiles TS → CJS (used by Node API).
2. `pnpm -F canvas-wasm build` compiles AssemblyScript → WASM.
3. `pnpm -F api build` builds NestJS app (uses shared CJS via `require`).
4. `pnpm -F web build` builds React SPA (uses shared TS source via Vite alias; Vite compiles it inline).

---

## 3. Container View

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Web SPA** | React + Vite + TypeScript + Tailwind v4 | React 19.2, Vite 8, TS ~6.0, Tailwind 4.3 | Browser UI: 5 role dashboards (1 codebase, theme via `data-role`), Studio canvas, axios HTTP client |
| **API Server** | NestJS + TypeScript + MySQL client | NestJS 11, TS 5.7, mysql2 3.22 | 26 domain modules; JWT auth + role guards; raw SQL (no ORM); Multer file upload; request lifecycle validation via class-validator/transformer |
| **Shared Lib** | TypeScript enums + state machines | TS ~6.0 | Single source of truth: Role, status enums; transition validators; DTO shapes |
| **Canvas WASM** | AssemblyScript → WASM | Latest | Pixel-op acceleration for Studio raster drawing (brush fill, selection, etc.) |
| **Database** | MySQL 8 (Docker) | 8.0 | 29 tables: users & profiles (5 role profiles), series lifecycle, chapters/pages/regions, tasks/submissions, voting/rankings/decisions, earnings/disputes, cross-cut audit/notifications |
| **ONNX Runtime Web** | @onnxruntime/web (lazy loaded) | 1.26 | In-browser AI: YOLO (panel detect), MobileSAM (smart select), DeOldify (colorize); all in web workers for non-blocking UI |

**Architecture diagram:**

```mermaid
graph TB
    Browser["Browser<br/>(Web SPA)"]
    Web["web/ (React 19 + Vite 8)<br/>- AppShell (data-role theming)<br/>- 5 role dashboards<br/>- Studio canvas<br/>- axios client"]
    Shared["shared/<br/>Enums (Role, Status)<br/>Transitions"]
    WasmCanvas["canvas-wasm/<br/>WASM ops"]
    
    Proxy["Vite Dev Server :5173<br/>Proxy /api → :3000<br/>Proxy /uploads → :3000"]
    
    API["api/ (NestJS 11)<br/>- 26 domain modules<br/>- JwtAuthGuard<br/>- RolesGuard<br/>- DbService"]
    DB["MySQL 8<br/>:3308 (Docker)<br/>29 tables"]
    Uploads["./uploads/<br/>(static assets)"]
    
    Browser --> Proxy
    Proxy --> Web
    Proxy --> Uploads
    Web --> Shared
    Web --> WasmCanvas
    
    Proxy -->|/api| API
    API --> DB
    API --> Uploads
    
    style Web fill:#e1f5ff
    style API fill:#fff3e0
    style DB fill:#f3e5f5
    style Shared fill:#e0f2f1
    style WasmCanvas fill:#ede7f6
```

---

## 4. Backend Component View

### Module Registration

NestJS `app.module.ts` imports 26 domain modules (plus ConfigModule and DbModule):

**Core infrastructure:**
- `DbModule` — MySQL connection, DbService (query/queryOne/insert helpers)
- `ConfigModule` — Environment variables via @nestjs/config
- `AuthModule` — JwtStrategy, AuthController (login, Google OAuth), auth guards

**Domain modules (module-per-domain pattern):**
- `UsersModule` — User entity, profile fetching
- `ProposalsModule` — Series proposal lifecycle (MANGAKA author, BOARD decide)
- `SeriesModule` — Series status, editor assignment
- `ChaptersModule` — Chapter lifecycle, Tantou editor review
- `PagesModule` — Page versioning, status tracking
- `RegionsModule` — Region metadata (panels, bubbles, backgrounds)
- `TasksModule` — Task creation, auto-pricing, assignment
- `SubmissionsModule` — Assistant work submission, mangaka review, earnings accrual
- `AnnotationsModule` — Editorial feedback (polymorphic on PAGE/MANUSCRIPT/SUBMISSION)
- `StudioModule` — Canvas document persistence (studio/page-versions, studio/docs)
- `RankingsModule` — Vote periods, voting, ranking calculation, risk scoring
- `DecisionsModule` — Editorial board decisions (continue/cancel/hiatus/frequency-change)
- `EarningsModule` — Assistant earnings aggregation (total + task list)
- `DisputesModule` — Payment disputes, admin resolution
- `DashboardModule` — Role-aware summaries (series, tasks, submissions, notifications)
- `NotificationsModule` — Notification table write; service injected across domains
- `AdminModule` — User activation, role management
- `GenresModule` — Genre lookup
- `UploadsModule` — Multer file upload, disk persistence
- `SeedModule` — Database seeding for dev

### Guard & DTO Architecture

**JwtAuthGuard** — extracts Bearer token from `Authorization: Bearer <JWT>`, verifies signature via `@nestjs/jwt` (strategy in AuthModule).

**RolesGuard** — reads `@Roles(Role.X, Role.Y)` decorator metadata; allows request if user's role is in the list.

**Class-validator/transformer pipeline** — `ValidationPipe({whitelist: true, transform: true})` registered globally in `main.ts`. DTOs define allowed fields + type coercion.

### Representative Module: Tasks

```mermaid
classDiagram
    class TaskController {
        +POST /tasks(dto) → number auto-priced
        +GET /tasks/mine [ASSISTANT]
        +GET /tasks?pageId=
        +PATCH /tasks/:id/start [ASSISTANT]
    }
    
    class TaskService {
        +create(dto): Task auto-priced from TaskPriceRule
        +getTasksForAssistant(userId): Task[]
        +startTask(taskId, userId)
    }
    
    class DbService {
        +query(sql, params): T[]
        +queryOne(sql, params): T | null
        +insert(sql, params): {insertId: number}
    }
    
    class TaskPriceRule {
        - rule_id: number
        - region_type: RegionType enum
        - base_price: decimal
        - effective_from/to
    }
    
    class JwtAuthGuard {
        +canActivate(context): boolean
    }
    
    class RolesGuard {
        +canActivate(context): boolean
    }
    
    TaskController --> TaskService
    TaskService --> DbService
    TaskController -- JwtAuthGuard : @UseGuards
    TaskController -- RolesGuard : @UseGuards
    TaskService --> TaskPriceRule
```

**Request flow (task creation):**
1. Controller receives POST with `CreateTaskDto` (validate via class-validator).
2. JwtAuthGuard extracts user from JWT; RolesGuard checks `@Roles(Role.MANGAKA)`.
3. Service queries `TaskPriceRule` for active rule matching `region_type`; auto-sets `payment_amount`.
4. Service calls `DbService.insert(sql, [values])` → MySQL returns `insertId`.
5. NotificationsService.notify() fires asynchronously to assignee.

### DbService Pattern (Raw SQL, No ORM)

```typescript
// In db.service.ts
export class DbService {
  async query<T>(sql: string, params: any[]): Promise<T[]> {
    const [rows] = await this.connection.execute(sql, params);
    return rows as T[];
  }

  async queryOne<T>(sql: string, params: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }

  async insert(sql: string, params: any[]): Promise<{ insertId: number }> {
    const [result] = await this.connection.execute(sql, params);
    return { insertId: result.insertId };
  }
}

// In a service:
async createTask(pageId: number, regionId: number, assigneeId: number) {
  const rule = await this.db.queryOne<TaskPriceRule>(
    `SELECT * FROM Task_Price_Rule WHERE region_type = ? AND is_active = 1 LIMIT 1`,
    [regionType]
  );
  
  const { insertId } = await this.db.insert(
    `INSERT INTO Task (region_id, page_id, assignee_user_id, payment_amount, ...)
     VALUES (?, ?, ?, ?, ...)`,
    [regionId, pageId, assigneeId, rule.base_price, ...]
  );
  
  return { task_id: insertId };
}
```

---

## 5. Frontend Architecture

### App Router & Layout

```typescript
// App.tsx (simplified)
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        
        {/* All other routes require auth + role assignment */}
        <Route element={<Protected><AppShell /></Protected>}>
          {/* Mangaka routes */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/proposals" element={<ProposalList />} />
          <Route path="/series" element={<SeriesList />} />
          <Route path="/series/:id" element={<SeriesDetail />} />
          <Route path="/series/:seriesId/chapters/:chapterId" element={<ChapterWorkspace />} />
          <Route path="/review" element={<SubmissionReview />} />
          
          {/* Editorial Board routes */}
          <Route path="/board/proposals" element={<ProposalQueue />} />
          <Route path="/board/series" element={<SeriesEditorAssignment />} />
          <Route path="/board/rankings" element={<Rankings />} />
          
          {/* Tantou Editor routes */}
          <Route path="/editor/review" element={<EditorReviewQueue />} />
          <Route path="/editor/review/:chapterId" element={<ChapterReview />} />
          
          {/* Assistant routes */}
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/earnings" element={<Earnings />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="/admin/disputes" element={<DisputeList />} />
          
          {/* Studio routes (no shell) */}
          <Route path="/studio/page/:pageId" element={<Studio />} />
          <Route path="/studio/region/:taskId" element={<Studio />} />
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### AppShell & Per-Role Theming

```typescript
// AppShell.tsx
export function AppShell({ children }) {
  const { user } = useAuth();
  
  return (
    <div data-role={user.role}>  {/* CSS scoping via data-role attribute */}
      <Header />
      <SideNav role={user.role} />
      <main>{children}</main>
    </div>
  );
}

// Global CSS token definition (Tailwind v4 + CSS Variables)
// styles/theme.css
:root {
  --color-primary: #2196F3;
  --color-secondary: #FF9800;
  /* ... other tokens */
}

[data-role="MANGAKA"] {
  --color-primary: #4CAF50;    /* Green for mangaka */
}

[data-role="ASSISTANT"] {
  --color-primary: #FF5722;    /* Orange for assistant */
}

/* ... 3 more role themes */
```

**Single component set** — all UI components (`Button`, `Card`, `Nav`, `Form`, etc.) are role-agnostic and consume CSS tokens. The `data-role` attribute swaps token values, requiring **zero component duplication** across the 5 roles.

### API Client

```typescript
// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',  // Proxied by Vite dev server or CORS in production
});

// Request interceptor: add Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 → redirect to /login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Usage in component or service:
const response = await api.post('/tasks', { pageId, regionId, assigneeId });
```

### Auth Context

```typescript
// lib/auth.tsx
const AuthContext = React.createContext<{
  user: User | null;
  login(email, password): Promise<void>;
  logout(): void;
} | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be in AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState<User | null>(null);
  
  React.useEffect(() => {
    // On app load, fetch /api/auth/me if token in localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      api.get('/auth/me').then(res => setUser(res.data)).catch(() => {
        localStorage.removeItem('auth_token');
      });
    }
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, login: ..., logout: ... }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 6. Studio & On-Device AI Architecture

### Studio Overview

The Studio is a full-screen raster drawing application (separate from AppShell) for assistants and mangaka to create/edit manga pages on-canvas. Modules:

```
apps/web/src/lib/studio/
├── document.ts          # Layer management, undo/redo
├── history.ts           # History (undo/redo) state machine
├── view.ts              # Pan, zoom, viewport transforms
├── engine.ts            # Render loop, frame timing
├── color.ts             # Color picker, palette
├── selection.ts         # Selection tool state
├── transform.ts         # Move/rotate/scale transforms
├── panels.ts            # Panel detection & boundary drawing
├── lines.ts             # Line drawing, stroke styles
├── text.ts              # Text layer, font rendering
├── bubbles.ts           # Dialogue bubble drawing
├── io.ts                # Import (PNG/PSD), export (PNG/PDF)
├── tools/               # Tool implementations
│   ├── brush.ts
│   ├── eraser.ts
│   ├── fill.ts
│   ├── selection.ts
│   ├── transform.ts
│   ├── panel.ts
│   ├── line.ts
│   ├── text.ts
│   └── bubble.ts
└── ai/                  # AI assist modules
    ├── heuristic.ts     # Fallback: color clustering, edge detection
    ├── onnx/
    │   ├── runtime.ts   # ONNX Runtime Web initialization
    │   ├── models.ts    # Model manifest (lazy load URLs)
    │   ├── available.ts # Capability probe (check env, model availability)
    │   ├── yolo.ts      # Panel detection (YOLOv8)
    │   ├── sam.ts       # Smart segmentation (MobileSAM)
    │   ├── colorize.ts  # Automatic colorization (DeOldify)
    │   ├── sam.worker.ts    # Web worker for SAM inference
    │   └── colorize.worker.ts  # Web worker for colorize
    └── index.ts         # AI assist orchestrator
```

### AI Architecture Diagram

```mermaid
graph TB
    User["User (Studio Canvas)"]
    Tools["Tool: Brush | Eraser | Fill | Select"]
    AIAssist["AIAssist Orchestrator<br/>try ONNX models<br/>fallback to heuristic"]
    
    Heuristic["Heuristic<br/>- Color clustering<br/>- Edge detection<br/>- Contour following"]
    
    OnnxRuntime["ONNX Runtime Web<br/>Lazy load models<br/>Capability probe"]
    
    YOLO["YOLO Panel Detect<br/>Returns: panel bounds"]
    SAM["MobileSAM Smart Select<br/>Point → mask<br/>Bounding box → mask"]
    Colorize["DeOldify Colorize<br/>B&W → color prediction"]
    
    SAMWorker["sam.worker.ts<br/>Worker thread inference"]
    ColorizeWorker["colorize.worker.ts<br/>Worker thread inference"]
    
    Canvas["Canvas Update<br/>Region.ai_suggested=true"]
    
    User --> Tools
    Tools --> AIAssist
    
    AIAssist --> OnnxRuntime
    AIAssist --> Heuristic
    
    OnnxRuntime --> YOLO
    OnnxRuntime --> SAM
    OnnxRuntime --> Colorize
    
    SAM --> SAMWorker
    Colorize --> ColorizeWorker
    
    YOLO --> Canvas
    SAMWorker --> Canvas
    ColorizeWorker --> Canvas
    Heuristic --> Canvas
    
    style Heuristic fill:#e8f5e9
    style OnnxRuntime fill:#fff3e0
    style SAMWorker fill:#e3f2fd
    style ColorizeWorker fill:#f3e5f5
```

### AI Assist Flow (Pseudocode)

```typescript
// lib/studio/ai/index.ts
export class AIAssist {
  private heuristic = new HeuristicAI();
  private onnx = new OnnxAI();
  
  async detectPanels(canvas: CanvasImageData) {
    try {
      if (await this.onnx.available()) {
        return await this.onnx.yolo.detect(canvas);  // YOLO panel detection
      }
    } catch (err) {
      console.warn('YOLO failed, using heuristic', err);
    }
    return this.heuristic.detectPanelContours(canvas);
  }
  
  async smartSelect(point: {x, y}, canvas: CanvasImageData) {
    try {
      if (await this.onnx.available()) {
        // sam.worker.ts runs inference in background thread
        return await this.onnx.sam.segmentFromPoint(point, canvas);
      }
    } catch (err) {
      console.warn('SAM failed, using heuristic', err);
    }
    return this.heuristic.floodFill(point, canvas);  // Fallback: standard flood fill
  }
  
  async colorizeImage(bwImage: CanvasImageData) {
    try {
      if (await this.onnx.available()) {
        // colorize.worker.ts runs inference
        return await this.onnx.colorize.predict(bwImage);
      }
    } catch (err) {
      console.warn('Colorize failed, using heuristic', err);
    }
    return this.heuristic.colorizeBW(bwImage);  // Fallback: average palette coloring
  }
}

// In studio tools:
const aiAssist = new AIAssist();
const panelMask = await aiAssist.detectPanels(canvas);
createRegion({ type: 'PANEL', mask: panelMask, ai_suggested: true });
```

### Key Design Decisions

1. **Heuristic fallback always present** — detects panels via edge detection + contour following; selects regions via flood fill; colorizes via palette averaging. User always has a working tool even if model download fails.

2. **Lazy model loading** — ONNX models (~20–100 MB each) only download on first use. `available()` probe checks browser cache + network capability before attempting.

3. **Web workers** — SAM and Colorize run in dedicated workers to avoid blocking the main UI thread. Model inference can take 1–2 seconds; workers keep the canvas interactive.

4. **Privacy + zero-cost** — all inference happens in-browser. No server calls, no image upload, no cost per inference. Models are open-source (Ultralytics YOLO, Meta SAM, DeOldify).

5. **Region.ai_suggested flag** — when AI detects a region, it marks `ai_suggested=true` so editors can easily identify AI-assisted work vs. manual markup.

---

## 7. Request Lifecycle

### Authenticated API Call Sequence

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant Web as Web SPA
    participant Proxy as Vite Proxy<br/>:5173
    participant API as NestJS API<br/>:3000
    participant Guard as JwtAuthGuard<br/>+ RolesGuard
    participant Ctrl as Controller
    participant Svc as Service
    participant DbSvc as DbService
    participant MySQL as MySQL<br/>:3308
    
    Browser->>Web: axios.post('/api/tasks', {pageId, assigneeId})
    activate Web
    Web->>Web: Interceptor: add Authorization header
    Web->>Proxy: POST /api/tasks
    Proxy->>API: (proxied request)
    deactivate Web
    
    activate API
    API->>Guard: JwtAuthGuard.canActivate()
    Guard->>Guard: Extract & verify JWT
    Guard->>API: ✓ User attached to request
    
    API->>Guard: RolesGuard.canActivate()
    Guard->>Guard: Check @Roles(Role.MANGAKA)
    Guard->>API: ✓ Role authorized
    
    API->>API: ValidationPipe: validate CreateTaskDto
    API->>Ctrl: Controller.createTask(dto)
    
    activate Ctrl
    Ctrl->>Svc: TaskService.create(dto)
    
    activate Svc
    Svc->>DbSvc: query TaskPriceRule
    DbSvc->>MySQL: SELECT * FROM Task_Price_Rule WHERE ...
    MySQL-->>DbSvc: {rule_id, base_price, ...}
    DbSvc-->>Svc: rule
    
    Svc->>DbSvc: insert(sql, [regionId, pageId, assigneeId, base_price])
    DbSvc->>MySQL: INSERT INTO Task (...)
    MySQL-->>DbSvc: {insertId: 42}
    DbSvc-->>Svc: {insertId: 42}
    
    Svc->>Svc: NotificationsService.notify(assigneeId, 'TASK_ASSIGNMENT', ...)
    Svc-->>Ctrl: {task_id: 42, payment_amount: 50.00}
    deactivate Svc
    
    Ctrl-->>API: HTTP 200 JSON response
    deactivate Ctrl
    deactivate API
    
    API-->>Proxy: response
    Proxy-->>Web: response
    activate Web
    Web->>Web: Interceptor: handle response
    Web->>Browser: Update UI (task created)
    deactivate Web
```

**Key checkpoints:**
1. **Bearer token** — Web adds `Authorization: Bearer <JWT>` header.
2. **JwtAuthGuard** — verifies signature, extracts `sub` (user_id) and `role` from payload.
3. **RolesGuard** — checks if user's role is in the controller method's `@Roles(...)` list.
4. **ValidationPipe** — coerces/validates incoming DTO fields (class-validator decorators).
5. **Service layer** — applies business logic, calls DbService for normalized queries.
6. **DbService** — wraps mysql2 connection, parameterized queries for SQL injection safety.
7. **Response** — controller returns DTO/plain object; NestJS serializes to JSON.

---

## 8. Build, Run & Deploy

### Development Setup

```bash
# Prerequisites
node --version  # >=20
pnpm --version  # 11.0.9+
docker --version

# 1. Install dependencies
pnpm install

# 2. Start MySQL (Docker)
pnpm db:up
# → MySQL listens on host :3308

# 3. In one terminal: run API
pnpm dev:api
# → NestJS bootstraps, listens :3000
# → Logs: "Manga API → http://localhost:3000/api"

# 4. In another terminal: run web
pnpm dev:web
# → Vite dev server, listens :5173
# → Proxy rules: /api → :3000, /uploads → :3000
# → HMR (hot module reload) enabled

# 5. Open browser
# → http://localhost:5173/login
# → Demo logins (password: Dung123456@)
#   - mangaka@studio.local
#   - assistant@studio.local
#   - editor@studio.local
#   - board@studio.local
#   - admin@studio.local

# Stop database
pnpm db:down
```

### Build for Production

```bash
# Build all packages and apps
pnpm build
# Outputs:
# - apps/web/dist/     → Static SPA (React 19, optimized, tree-shaken, code-split)
# - apps/api/dist/     → Compiled NestJS app (CommonJS)
# - packages/shared/dist/    → CJS modules (enums + transitions)
# - packages/canvas-wasm/dist/   → WASM binary + .d.ts

# Run tests before deploying
pnpm -r test          # Jest (API) + Vitest (Web)
```

### Production Deployment Shape

```
┌─────────────────────────────────────────┐
│ Client Browser (any device)             │
│ - Loads SPA from CDN (apps/web/dist)    │
│ - XHR/Fetch calls api.example.com/api   │
└─────────────────────────────────────────┘
                    ↓ HTTPS
┌─────────────────────────────────────────┐
│ CDN / Reverse Proxy (CloudFlare, nginx) │
│ - Caches static /dist/* files           │
│ - Forwards /api/* to backend origin     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Backend Node.js (docker/k8s)            │
│ - NODE_ENV=production                   │
│ - apps/api/dist/* (NestJS compiled)     │
│ - PORT=3000 (or 8080 in k8s)            │
│ - .env (secrets via env vars, not file) │
│ - /uploads → routes to object storage   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ MySQL 8 (managed RDS or docker)         │
│ - Hostname via $DATABASE_URL or .env    │
│ - Port 3306 (not 3308)                  │
│ - Migrations: db/01-schema.sql (run on  │
│   startup or via CI/CD)                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Object Storage (S3, GCS, etc.)          │
│ - /uploads/* files (images, PDFs)       │
│ - Served via pre-signed URLs or CDN     │
└─────────────────────────────────────────┘
```

### Environment Configuration

**Backend (NestJS, apps/api/.env):**
```env
NODE_ENV=production
PORT=3000
CLIENT_URL=https://app.example.com
DATABASE_URL=mysql2://user:pass@db-host:3306/manga_db
JWT_SECRET=<strong-random-string>
GOOGLE_CLIENT_ID=<OAuth client ID>
GOOGLE_CLIENT_SECRET=<OAuth secret>
UPLOADS_DIR=/tmp/uploads (or mount to object storage SDK)
```

**Web (React, loaded at build time via Vite .env):**
```env
VITE_API_BASE_URL=https://api.example.com  # or omit to use same origin
```

**NestJS ConfigService reads environment variables:**
```typescript
// In any module:
constructor(private config: ConfigService) {}

async someMethod() {
  const dbUrl = this.config.get('DATABASE_URL');  // typed via ConfigModule schema
  const port = this.config.get('PORT', 3000);     // default fallback
}
```

### Secrets Management

- **Never commit `.env` file** — add to `.gitignore`.
- **CI/CD** — inject secrets via GitHub Secrets, GitLab CI/CD Variables, or deployment platform secrets (Vercel, Render, Railway, etc.).
- **Docker** — use `--env-file` or pass `--env KEY=VALUE` at runtime.
- **Kubernetes** — use `Secret` resources; inject via `envFrom` or volume mounts.

---

## Cross-References

Related documentation:
- `../03-database/01-database-design.md` — 29 table schema, primary keys, foreign keys, indices, enum definitions.
- `../04-security/01-security-and-rbac.md` — JWT flow, RolesGuard implementation, password hashing, Google OAuth, CORS policy.
- `../03-api/01-api-reference.md` — REST endpoint catalog with request/response examples, status codes, error handling.

