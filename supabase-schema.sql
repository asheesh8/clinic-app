-- Run this in your Supabase SQL editor to set up the database

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  preferred_name text,
  role text,                        -- 'Physician', 'Nurse Practitioner', etc.
  organization text,                -- clinic/agency name
  pronouns text,                    -- 'he/him', 'she/her', 'they/them', custom
  preferred_title text,             -- 'Doctor', 'Nurse', 'APRN', 'First Name', etc.
  visibility text default 'org',    -- 'team' | 'org' | 'global'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workspace preferences
create table public.workspace_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  prefers_same_location boolean,
  prefers_same_team_daily boolean,
  prefers_designated_desk boolean,
  ok_working_late boolean,
  prefers_early_start boolean,
  satisfied_with_admin_time boolean,
  preferred_admin_time_minutes int,
  has_enough_support_staff boolean,
  prefers_ergonomic_desk boolean,
  prefers_ergonomic_chair boolean,
  prefers_staff_kitchen boolean,
  prefers_fridge boolean,
  prefers_dining_area boolean,
  prefers_coffee_tea boolean,
  prefers_separate_staff_bath boolean,
  prefers_designated_parking boolean,
  vehicle_size text,                -- 'larger' | 'standard'
  updated_at timestamptz default now()
);

-- Workflow templates (one row per user per visit type)
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  visit_type text not null,         -- 'standard_30min' | 'joint_injection' | 'omt' | 'awv' | 'new_patient'
  role_in_visit text not null,      -- 'nursing' | 'provider'
  answers jsonb not null default '{}',  -- key: step_id, value: { selected: bool, preferred_time_min: int, notes: text }
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, visit_type, role_in_visit)
);

-- Compatibility scores (computed when both parties have completed a workflow)
create table public.compatibility_scores (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references public.profiles(id) on delete cascade,
  user_b uuid references public.profiles(id) on delete cascade,
  visit_type text not null,
  score_pct numeric(5,2),           -- 0.00–100.00
  agreed_workflow jsonb,            -- final merged workflow agreed by both
  computed_at timestamptz default now(),
  unique(user_a, user_b, visit_type)
);

-- Follow relationships (who can view whose workflows)
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  approved boolean default false,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Row Level Security

alter table public.profiles enable row level security;
alter table public.workspace_preferences enable row level security;
alter table public.workflows enable row level security;
alter table public.compatibility_scores enable row level security;
alter table public.follows enable row level security;

-- Profiles: users can always read their own; others based on visibility setting
create policy "own profile" on public.profiles
  for all using (auth.uid() = id);

create policy "read org profiles" on public.profiles
  for select using (
    visibility = 'global'
    or (visibility = 'org' and organization = (
      select organization from public.profiles where id = auth.uid()
    ))
  );

-- Workspace prefs: own only
create policy "own workspace prefs" on public.workspace_preferences
  for all using (auth.uid() = user_id);

-- Workflows: own + approved followers
create policy "own workflows" on public.workflows
  for all using (auth.uid() = user_id);

create policy "followers can read workflows" on public.workflows
  for select using (
    exists (
      select 1 from public.follows
      where follower_id = auth.uid()
        and following_id = workflows.user_id
        and approved = true
    )
  );

-- Compatibility scores: visible to both parties
create policy "own compatibility scores" on public.compatibility_scores
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- Follows: manage own
create policy "own follows" on public.follows
  for all using (auth.uid() = follower_id or auth.uid() = following_id);
