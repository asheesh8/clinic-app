# FlowSync — Database Schema (ER Diagram)

```mermaid
erDiagram

    AUTH_USERS {
        uuid    id          PK
        text    email
        timestamptz created_at
    }

    PROFILES {
        uuid    id              PK "FK → auth.users.id"
        text    email
        text    preferred_name
        text    role
        text    organization
        text    pronouns
        text    preferred_title
        text    visibility       "team | org | global"
        timestamptz created_at
        timestamptz updated_at
    }

    WORKSPACE_PREFERENCES {
        uuid    id                          PK
        uuid    user_id                     FK
        boolean prefers_same_location
        boolean prefers_same_team_daily
        boolean prefers_designated_desk
        boolean ok_working_late
        boolean prefers_early_start
        boolean satisfied_with_admin_time
        int     preferred_admin_time_minutes
        boolean has_enough_support_staff
        boolean prefers_ergonomic_desk
        boolean prefers_ergonomic_chair
        boolean prefers_staff_kitchen
        boolean prefers_fridge
        boolean prefers_dining_area
        boolean prefers_coffee_tea
        boolean prefers_separate_staff_bath
        boolean prefers_designated_parking
        text    vehicle_size                "larger | standard"
        timestamptz updated_at
    }

    WORKFLOWS {
        uuid    id              PK
        uuid    user_id         FK
        text    visit_type      "standard_30min | joint_injection | omt | awv | new_patient"
        text    role_in_visit   "nursing | provider"
        jsonb   answers         "{ step_id: { selected, preferred_time_min, notes } }"
        boolean completed
        timestamptz created_at
        timestamptz updated_at
    }

    COMPATIBILITY_SCORES {
        uuid    id              PK
        uuid    user_a          FK
        uuid    user_b          FK
        text    visit_type
        numeric score_pct       "0.00–100.00"
        jsonb   agreed_workflow "merged final workflow"
        timestamptz computed_at
    }

    FOLLOWS {
        uuid    follower_id     PK "FK → profiles.id"
        uuid    following_id    PK "FK → profiles.id"
        boolean approved
        timestamptz created_at
    }

    AUTH_USERS          ||--||  PROFILES               : "1-to-1 extends"
    PROFILES            ||--o|  WORKSPACE_PREFERENCES  : "1-to-0..1 has"
    PROFILES            ||--o{  WORKFLOWS              : "1-to-many submits"
    PROFILES            ||--o{  COMPATIBILITY_SCORES   : "1-to-many as user_a"
    PROFILES            ||--o{  COMPATIBILITY_SCORES   : "1-to-many as user_b"
    PROFILES            ||--o{  FOLLOWS                : "1-to-many as follower"
    PROFILES            ||--o{  FOLLOWS                : "1-to-many as following"
```

## Key Constraints

| Table | PK | FK(s) | Unique Constraint |
|---|---|---|---|
| `profiles` | `id` | `id → auth.users.id` | — |
| `workspace_preferences` | `id` | `user_id → profiles.id` | — |
| `workflows` | `id` | `user_id → profiles.id` | `(user_id, visit_type, role_in_visit)` |
| `compatibility_scores` | `id` | `user_a → profiles.id`, `user_b → profiles.id` | `(user_a, user_b, visit_type)` |
| `follows` | `(follower_id, following_id)` composite | both → `profiles.id` | — (PK is the constraint) |

## Notes

- **`profiles.id`** is both a PK and an FK — it directly mirrors `auth.users.id` so Supabase Auth and app data stay in sync.
- **`workspace_preferences`** is 0..1 per user (a user may not have filled it out yet).
- **`workflows`** unique constraint prevents duplicate submissions for the same user + visit type + role combination.
- **`compatibility_scores`** stores both `user_a` and `user_b` as separate FKs so the join is symmetric and indexable.
- **`follows`** uses a composite PK `(follower_id, following_id)` — no surrogate key needed, the pair is inherently unique.
- **`answers` (jsonb)** in `workflows` is intentionally flexible so new workflow steps can be added without schema migrations.
