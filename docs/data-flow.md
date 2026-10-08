# Data Flow Diagram

## Level 0: System Context

The web client communicates directly with Supabase. PostgreSQL Row Level Security (RLS) scopes authenticated data access; trusted Edge Functions handle privileged operations.

```mermaid
flowchart LR
    student[Student]
    maintenance[Maintenance staff]
    teacher[Teacher]
    admin[Administrator]
    app([School Facility Complaint Monitoring System])
    auth[(Supabase Auth)]
    database[(Supabase PostgreSQL)]
    storage[(Private complaint photo storage)]
    functions[[Supabase Edge Functions]]
    push[Web Push service]

    student -->|Sign-in, complaints, academic concerns, feedback| app
    maintenance -->|Sign-in, assigned work, repair updates| app
    teacher -->|Sign-in, academic concern responses| app
    admin -->|Sign-in, reviews, assignments, administration, reports| app

    app <-->|Credentials, session, identity| auth
    app <-->|RLS-scoped reads and writes| database
    app <-->|Photo uploads and signed photo access| storage
    app -->|Authorized privileged requests| functions
    functions <-->|Validated privileged data operations| database
    functions -->|Push notification payload| push
    push -->|Complaint or academic update| student
    push -->|Work assignment or update| maintenance
    push -->|Academic concern update| teacher
    push -->|Administrative alert| admin
```

## Level 1: Main Data Flows

```mermaid
flowchart LR
    student[Student]
    maintenance[Maintenance staff]
    teacher[Teacher]
    admin[Administrator]
    app([Web application])

    auth[(D1 Auth users and profiles)]
    complaints[(D2 Complaints, assignments, comments, status history, feedback)]
    academic[(D3 Academic concerns and conversations)]
    photos[(D4 Private complaint photos)]
    notifications[(D5 Notifications and push subscriptions)]
    audit[(D6 Audit logs)]
    edge[[Edge Functions]]
    push[Web Push service]

    student -->|Credentials| app
    maintenance -->|Credentials| app
    teacher -->|Credentials| app
    admin -->|Credentials| app
    app <-->|Authenticate and load role| auth

    student -->|Complaint details and evidence metadata| app
    app -->|Create and read permitted complaint data| complaints
    student -->|Before and follow-up photos| app
    maintenance -->|Progress and completion updates| app
    app -->|Upload or request signed URL| photos
    complaints -->|Complaint, assignment, status, feedback| app
    app -->|Repair progress and status changes| complaints
    admin -->|Review, verify, assign, close or reopen| app
    app -->|Administrative complaint changes| complaints

    student -->|Confidential concern and teacher selection| app
    app -->|Submit and read role-permitted case data| academic
    admin -->|Review, request clarification, notify, schedule or decide| app
    teacher -->|Response to notified concern| app
    app -->|Role-checked concern actions and messages| academic
    academic -->|Permitted case updates| app

    complaints -->|Status and assignment events| notifications
    academic -->|Case and conversation events| notifications
    notifications -->|In-app updates| app
    app -->|Authenticated push registration| notifications
    admin -->|Authorized report request| app
    app -->|Admin-validated report or user operation| edge
    edge <-->|Privileged report or user operation| auth
    edge <-->|Report data and notification delivery| complaints
    edge <-->|Create notification or track push delivery| notifications
    notifications -->|Delivery request| edge
    edge -->|Push payload| push
    push -->|Role-appropriate update| student
    push -->|Role-appropriate update| maintenance
    push -->|Role-appropriate update| teacher
    push -->|Role-appropriate update| admin

    complaints -->|Workflow changes| audit
    academic -->|Administrative case actions| audit
```

## Data Handling Notes

- Authentication is managed by Supabase Auth; the application reads the matching profile to determine the portal role.
- The browser uses the publishable key. RLS policies authorize database reads and writes for the signed-in user; administrative Edge Functions validate the caller before using privileged access.
- Complaint images are stored as private objects. PostgreSQL stores their metadata and storage paths; authorized users receive temporary signed URLs.
- Complaint status history, assignments, feedback, academic messages, notifications, and audit records are persisted in PostgreSQL. Realtime changes update subscribed views.
- The Edge Functions support protected administration and reporting, manual complaint notifications, and web-push delivery. They do not replace the normal RLS-scoped browser-to-database path.