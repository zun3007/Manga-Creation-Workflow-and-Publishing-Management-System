# Activity & Workflow Diagrams
High-level activity flows and swimlane workflows for the Manga Creation & Publishing platform.

---

## 1. End-to-End Production Pipeline

From proposal submission through board governance to published chapter and earnings dispute resolution, with role swimlanes.

```mermaid
flowchart TD
    Start([Mangaka Proposes Series]) --> CreateProp["Create Proposal<br/>(DRAFT)"]
    CreateProp --> SubmitProp["Submit to Board<br/>(SUBMITTED)"]
    SubmitProp --> BoardReview{Board<br/>Review<br/>Proposal}
    BoardReview -->|REJECTED| PropReject["Proposal REJECTED<br/>(End)"]
    BoardReview -->|APPROVED| CreateSeries["Create Series<br/>(ACTIVE)"]
    CreateSeries --> AssignEditor["Editorial Board<br/>Assigns Tantou Editor"]
    AssignEditor --> MangakaWork["Mangaka Creates<br/>Chapter & Pages"]
    MangakaWork --> DefineRegions["Define Regions<br/>(PANEL, BUBBLE, etc)"]
    DefineRegions --> CreateTasks["Create Tasks<br/>(ASSIGNED)<br/>Auto-priced by region_type"]
    CreateTasks --> AssignAssist["Assign to Assistants"]
    AssignAssist --> AssistWork["Assistants Work<br/>& Submit<br/>(SUBMITTED)"]
    AssistWork --> MangakaReview{Mangaka<br/>Reviews<br/>Submission}
    MangakaReview -->|REVISION_REQUIRED| AssistWork
    MangakaReview -->|APPROVED| AccrueEarning["Accrue Assistant<br/>total_earnings<br/>+= payment_amount"]
    AccrueEarning --> ChapterReady["Chapter→<br/>READY_FOR_EDITOR_REVIEW"]
    ChapterReady --> EditorReview{Tantou Editor<br/>Reviews Chapter<br/>& Pages}
    EditorReview -->|Request Changes| ChapterInProg["Chapter→<br/>IN_PROGRESS"]
    ChapterInProg --> MangakaWork
    EditorReview -->|APPROVED| ChapterApproved["Chapter→<br/>EDITOR_APPROVED"]
    ChapterApproved --> PublishSched["Schedule Publication<br/>(SCHEDULED)"]
    PublishSched --> Publish["Publish Chapter<br/>(PUBLISHED)"]
    Publish --> VotePeriodOpen["Editorial Board<br/>Opens Vote Period"]
    VotePeriodOpen --> CastVotes["Board Members<br/>Cast Votes<br/>(score per member)"]
    CastVotes --> CloseVote{Close Vote<br/>Period}
    CloseVote --> ComputeRank["Compute Ranking<br/>(rank_position,<br/>total_score,<br/>risk_level)"]
    ComputeRank --> CheckRisk{Risk Level<br/>= HIGH?}
    CheckRisk -->|YES| SetAtRisk["Series→AT_RISK<br/>(notify mangaka)"]
    CheckRisk -->|NO| SeriesOK["Series→ACTIVE"]
    SetAtRisk --> Decision
    SeriesOK --> Decision{Decision:<br/>CONTINUE|<br/>CANCEL|<br/>HIATUS|<br/>CHANGE_FREQ}
    Decision -->|CONTINUE| SeriesCont["Series→ACTIVE<br/>(continue schedule)"]
    Decision -->|CANCEL| SeriesCancl["Series→CANCELLED"]
    Decision -->|HIATUS| SeriesHiat["Series→HIATUS"]
    Decision -->|CHANGE_FREQ| UpdateFreq["Update<br/>publication_frequency<br/>& Series→ACTIVE"]
    SeriesCont --> EarningReview
    SeriesCancl --> EarningReview
    SeriesHiat --> EarningReview
    UpdateFreq --> EarningReview["Assistant Reviews<br/>Earnings<br/>& May File Dispute"]
    EarningReview --> DisputeCheck{Dispute?}
    DisputeCheck -->|NO| End1([Complete])
    DisputeCheck -->|YES| OpenDispute["Open Dispute<br/>(OPEN)"]
    OpenDispute --> AdminReview["Admin Reviews<br/>(UNDER_REVIEW)"]
    AdminReview --> ResolveDisp{Resolve:<br/>RESOLVED|<br/>REJECTED}
    ResolveDisp -->|RESOLVED| UpdatePayment["Optional: adjust<br/>payment_amount<br/>& earnings"]
    ResolveDisp -->|REJECTED| DispReject["Dispute REJECTED"]
    UpdatePayment --> End2([Complete])
    DispReject --> End2
    PropReject --> End3([End])

    style Start fill:#90EE90
    style End1 fill:#90EE90
    style End2 fill:#90EE90
    style End3 fill:#FFB6C6
    style BoardReview fill:#FFE4B5
    style MangakaReview fill:#FFE4B5
    style EditorReview fill:#FFE4B5
    style CloseVote fill:#FFE4B5
    style CheckRisk fill:#FFE4B5
    style Decision fill:#FFE4B5
    style DisputeCheck fill:#FFE4B5
    style ResolveDisp fill:#FFE4B5
```

**State machine source:** Proposal (§5), Chapter (§5), Task (§5), Submission (§5), Series status (§5), Vote_Period / Ranking / Decision (§5), Earning_Dispute (§5); endpoints (§6).

---

## 2. Proposal Approval Workflow

DRAFT → SUBMITTED → UNDER_REVIEW → (APPROVED creates Series | REJECTED ends).

```mermaid
flowchart TD
    Draft["Mangaka Creates<br/>Proposal<br/>(DRAFT)"]
    Draft --> Submit["Mangaka Submits<br/>PATCH /proposals/:id/submit<br/>(DRAFT→SUBMITTED)"]
    Submit --> Submitted["Proposal: SUBMITTED<br/>Board notified"]
    Submitted --> Queue["Proposal in<br/>Board Review Queue<br/>GET /proposals/review-queue"]
    Queue --> Review["Editorial Board<br/>Reviews Details<br/>(title, synopsis,<br/>genres, frequency)"]
    Review --> Decision{Board<br/>Decision?}
    Decision -->|APPROVED| Approved["PATCH /proposals/:id/decision<br/>(APPROVED)"]
    Decision -->|REJECTED| Rejected["PATCH /proposals/:id/decision<br/>(REJECTED)"]
    Approved --> CreateSeries["Auto-create Series<br/>& notify Mangaka<br/>(Series: ACTIVE)"]
    CreateSeries --> ApproveEnd([Proposal APPROVED<br/>Series created])
    Rejected --> RejectEnd([Proposal REJECTED])

    style Draft fill:#E0E0FF
    style Submitted fill:#FFFFE0
    style Decision fill:#FFE4B5
    style ApproveEnd fill:#90EE90
    style RejectEnd fill:#FFB6C6
```

**State machine source:** PROPOSAL transitions (§5); `/proposals/*` endpoints (§6).

---

## 3. Task Production Loop

ASSIGNED → IN_PROGRESS → SUBMITTED → Mangaka review → APPROVED (earnings) or REVISION_REQUIRED (loop back).

```mermaid
flowchart TD
    TaskCreated["Mangaka Creates Task<br/>for a Region<br/>POST /tasks<br/>(auto-priced via<br/>Task_Price_Rule)"]
    TaskCreated --> Assign["Task: ASSIGNED<br/>Assistant assigned<br/>& notified"]
    Assign --> AssistReview{Assistant<br/>Accepts?}
    AssistReview -->|Yes| Start["Assistant clicks Start<br/>PATCH /tasks/:id/start<br/>(ASSIGNED→IN_PROGRESS)"]
    Start --> InProg["Task: IN_PROGRESS<br/>Assistant works"]
    InProg --> Submit["Assistant Uploads Work<br/>POST /submissions<br/>(Task→SUBMITTED)"]
    Submit --> Pending["Submission: PENDING<br/>Mangaka notified"]
    Pending --> Queue["Submission in<br/>Mangaka Review Queue<br/>GET /submissions/review-queue"]
    Queue --> MangakaReview["Mangaka Reviews Work"]
    MangakaReview --> Decision{Mangaka<br/>Decision?}
    Decision -->|APPROVED| Approve["PATCH /submissions/:id/review<br/>(APPROVED)"]
    Decision -->|REVISION_REQUIRED| Revise["PATCH /submissions/:id/review<br/>(REVISION_REQUIRED)"]
    Approve --> Accrue["Task: APPROVED<br/>Accrue Earnings:<br/>Assistant_Profile.total_earnings<br/>+= Task.payment_amount"]
    Accrue --> Complete([Task Closed<br/>Earnings recorded])
    Revise --> InProg
    AssistReview -->|No| TaskAssigned["Task stays ASSIGNED<br/>until accepted"]
    TaskAssigned --> AssistReview

    style TaskCreated fill:#E0E0FF
    style InProg fill:#FFFFE0
    style Decision fill:#FFE4B5
    style Accrue fill:#90EE90
    style Complete fill:#90EE90
```

**State machine source:** TASK transitions (§5), SUBMISSION transitions (§5); `/tasks/*`, `/submissions/*` endpoints (§6).

---

## 4. Chapter Lifecycle to Publish

DRAFT → IN_PROGRESS → READY_FOR_EDITOR_REVIEW → EDITOR_APPROVED → PUBLISHED.

```mermaid
flowchart TD
    CreateChap["Mangaka Creates Chapter<br/>POST /chapters<br/>(Chapter: DRAFT)"]
    CreateChap --> CreatePages["Add Pages & Versions<br/>POST /pages<br/>POST /page-versions<br/>(Page: RAW→ASSIGNED)"]
    CreatePages --> DefineRegions["Define Regions<br/>POST /regions<br/>(PANEL, BUBBLE, etc)"]
    DefineRegions --> WorkInProg["Mangaka Works<br/>PATCH /chapters/:id/status<br/>(DRAFT→IN_PROGRESS)"]
    WorkInProg --> InProg["Chapter: IN_PROGRESS<br/>Pages in various states"]
    InProg --> ReadyReview["Mangaka marks Ready<br/>PATCH /chapters/:id/status<br/>(IN_PROGRESS→<br/>READY_FOR_EDITOR_REVIEW)"]
    ReadyReview --> ForReview["Chapter: READY_FOR_EDITOR_REVIEW<br/>Tantou Editor notified<br/>GET /chapters/review-queue"]
    ForReview --> EditorReview["Tantou Editor Reviews<br/>Pages & Regions<br/>GET /chapters/:id/pages"]
    EditorReview --> AnnotateOpt["Optional: Add Annotations<br/>POST /annotations<br/>(feedback on issues)"]
    AnnotateOpt --> EditorDecision{Editor<br/>Decision?}
    EditorDecision -->|Request Changes| RequestChg["PATCH /chapters/:id/editor-review<br/>(IN_PROGRESS)<br/>Notify Mangaka"]
    RequestChg --> InProg
    EditorDecision -->|Approve| EditorApprove["PATCH /chapters/:id/editor-review<br/>(EDITOR_APPROVED)"]
    EditorApprove --> Approved["Chapter: EDITOR_APPROVED<br/>Ready to publish"]
    Approved --> Schedule["Mangaka Schedules Publication<br/>PATCH /chapters/:id/status<br/>(EDITOR_APPROVED→PUBLISHED)<br/>Create Publication_Schedule"]
    Schedule --> Published["Chapter: PUBLISHED<br/>Publication_Schedule.status=PUBLISHED<br/>Readers can access"]
    Published --> End([Chapter Complete])

    style CreateChap fill:#E0E0FF
    style InProg fill:#FFFFE0
    style EditorDecision fill:#FFE4B5
    style Approved fill:#C8E6C9
    style Published fill:#90EE90
    style End fill:#90EE90
```

**State machine source:** CHAPTER transitions (§5); `/chapters/*` endpoints (§6).

---

## 5. Governance & Ranking Loop

Open Vote Period → Cast Votes → Close & Compute Ranking → Decision (CONTINUE | CHANGE_FREQUENCY | HIATUS | CANCEL) → Update Series status.

```mermaid
flowchart TD
    BoardDecides["Editorial Board Decides<br/>to Rank & Evaluate<br/>a Series"]
    BoardDecides --> OpenPeriod["POST /vote-periods<br/>Open Vote Period<br/>Vote_Period: OPEN<br/>(WEEKLY or MONTHLY)"]
    OpenPeriod --> Period["Vote Period OPEN<br/>Board members notified<br/>GET /vote-periods/open"]
    Period --> CastLoop["Each Board Member<br/>Casts Vote<br/>POST /votes<br/>(score, comment)"]
    CastLoop --> LoopCheck{All<br/>Members<br/>Voted?}
    LoopCheck -->|No| CastLoop
    LoopCheck -->|Yes| ClosePeriod["Editorial Board<br/>Closes Period<br/>POST /vote-periods/:id/close"]
    ClosePeriod --> Compute["System Computes:<br/>• rank_position<br/>• total_score<br/>• risk_level (LOW|MEDIUM|HIGH)"]
    Compute --> RankingCreated["Ranking row created<br/>Series checked<br/>for risk"]
    RankingCreated --> RiskCheck{risk_level<br/>= HIGH?}
    RiskCheck -->|YES| AtRisk["Series→AT_RISK<br/>Notify Mangaka<br/>+ Editorial Board"]
    RiskCheck -->|NO| Active["Series→ACTIVE"]
    AtRisk --> Decision
    Active --> Decision{POST /decisions<br/>Apply Decision}
    Decision -->|CONTINUE| SetCont["Series→ACTIVE<br/>Keep current frequency<br/>(weekly/monthly)"]
    Decision -->|CHANGE_FREQUENCY| ChangeFreq["Series→ACTIVE<br/>Update publication_frequency<br/>+ notify Mangaka"]
    Decision -->|HIATUS| SetHiat["Series→HIATUS<br/>Suspend production<br/>+ notify Mangaka"]
    Decision -->|CANCEL| SetCanc["Series→CANCELLED<br/>End all production<br/>+ notify Mangaka"]
    SetCont --> End
    ChangeFreq --> End
    SetHiat --> End
    SetCanc --> End([Governance Cycle<br/>Complete])

    style BoardDecides fill:#FFE0E0
    style Period fill:#FFFFE0
    style CastLoop fill:#E0FFFF
    style Compute fill:#F0E68C
    style RiskCheck fill:#FFE4B5
    style Decision fill:#FFE4B5
    style End fill:#90EE90
```

**State machine source:** PROPOSAL (vote_period.status OPEN→CLOSED), Ranking (risk_level assignment), Series (AT_RISK, HIATUS, CANCELLED transitions via Decision, §5); `/vote-periods/*`, `/votes`, `/rankings`, `/decisions` endpoints (§6).

---

## 6. Earning Dispute Resolution

OPEN → UNDER_REVIEW → (RESOLVED [optional amount adjustment] | REJECTED).

```mermaid
flowchart TD
    AssistantCheck["Assistant Reviews<br/>Earnings<br/>GET /earnings/mine<br/>Sees approved tasks<br/>& payment_amount"]
    AssistantCheck --> Dispute{Dispute<br/>Payment?}
    Dispute -->|No| NoDisp([No Dispute<br/>Earnings Final])
    Dispute -->|Yes| FileDisp["POST /disputes<br/>File Earning Dispute<br/>(OPEN)<br/>Admin notified"]
    FileDisp --> Open["Earning_Dispute: OPEN<br/>dispute_reason +<br/>expected_amount"]
    Open --> AdminQueue["GET /disputes [ADMIN]<br/>Admin sees queue"]
    AdminQueue --> AdminReview["Admin Reviews<br/>PATCH /disputes/:id/review<br/>(OPEN→UNDER_REVIEW)"]
    AdminReview --> UnderRev["Earning_Dispute:<br/>UNDER_REVIEW"]
    UnderRev --> Investigate["Admin Investigates<br/>Task details +<br/>Submission history"]
    Investigate --> AdminDecision{Admin<br/>Decision?}
    AdminDecision -->|REJECTED| Reject["PATCH /disputes/:id/resolve<br/>(REJECTED)<br/>resolution_note set"]
    AdminDecision -->|RESOLVED| Resolve["PATCH /disputes/:id/resolve<br/>(RESOLVED)<br/>Optional: adjustedAmount"]
    Reject --> RejectEnd["Earning_Dispute: REJECTED<br/>Notify Assistant"]
    Resolve --> UpdatePayment["If adjustedAmount:<br/>Update Task.payment_amount<br/>+ Adjust Assistant_Profile<br/>.total_earnings by delta"]
    UpdatePayment --> ResolveEnd["Earning_Dispute: RESOLVED<br/>Notify Assistant<br/>+ Updated Earnings"]
    RejectEnd --> End([Dispute Closed])
    ResolveEnd --> End

    style AssistantCheck fill:#E0E0FF
    style Dispute fill:#FFE4B5
    style NoDisp fill:#90EE90
    style Open fill:#FFFFE0
    style UnderRev fill:#FFE0E0
    style AdminDecision fill:#FFE4B5
    style RejectEnd fill:#FFB6C6
    style ResolveEnd fill:#C8E6C9
    style End fill:#90EE90
```

**State machine source:** EARNING_DISPUTE transitions (§5); `/disputes/*` endpoints (§6).

---

## Cross-Reference
- **Domain model & state machines:** [`../02-architecture/03-domain-model-and-state-machines.md`](../02-architecture/03-domain-model-and-state-machines.md)
- **Sequence diagrams:** [`./02-sequence-diagrams.md`](./02-sequence-diagrams.md)
