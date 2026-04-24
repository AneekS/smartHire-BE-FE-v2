-- AI Mock Interview Room schema
-- Apply via InsForge `run-raw-sql` (MCP) or the project dashboard SQL runner.
-- Tables are InsForge-native (snake_case). They are independent of the
-- Prisma-managed PascalCase tables (`MockInterviewSession`, etc.) which are
-- being deprecated as part of this feature cut-over.

create extension if not exists "pgcrypto";

-- Interview sessions
create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  interview_type text not null check (interview_type in ('technical', 'behavioral', 'system_design', 'dsa')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  status text not null default 'setup' check (status in ('setup', 'active', 'completed', 'abandoned')),
  duration_minutes int not null default 45,
  started_at timestamptz,
  ended_at timestamptz,
  overall_score int,
  created_at timestamptz not null default now()
);

create index if not exists interview_sessions_user_id_idx on interview_sessions(user_id);
create index if not exists interview_sessions_created_at_idx on interview_sessions(created_at desc);

-- Interview messages (full conversation transcript)
create table if not exists interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  role text not null check (role in ('interviewer', 'candidate')),
  content text not null,
  question_number int,
  created_at timestamptz not null default now()
);

create index if not exists interview_messages_session_created_idx on interview_messages(session_id, created_at);

-- Per-answer evaluation
create table if not exists interview_evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interview_sessions(id) on delete cascade,
  message_id uuid not null references interview_messages(id) on delete cascade,
  question_text text not null,
  answer_text text not null,
  score int check (score between 0 and 100),
  feedback text,
  keywords_matched text[],
  areas_to_improve text[],
  created_at timestamptz not null default now()
);

create index if not exists interview_evaluations_session_idx on interview_evaluations(session_id);

-- Final session feedback report
create table if not exists interview_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references interview_sessions(id) on delete cascade,
  overall_score int,
  technical_score int,
  communication_score int,
  depth_score int,
  strengths text[],
  improvements text[],
  recommended_resources text[],
  summary text,
  created_at timestamptz not null default now()
);

-- Question bank (seeded, role-tagged)
create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  interview_type text not null,
  difficulty text not null,
  question text not null,
  follow_ups text[],
  evaluation_criteria text[],
  tags text[],
  created_at timestamptz not null default now()
);

create index if not exists question_bank_role_type_idx on question_bank(role, interview_type, difficulty);

-- Seed a small curated set so the UI has something to surface on day one.
insert into question_bank (role, interview_type, difficulty, question, follow_ups, evaluation_criteria, tags)
values
  ('Frontend Engineer', 'technical', 'medium',
   'Walk me through how you would architect a reusable, accessible modal component in React.',
   array['How do you manage focus trapping?', 'How would you animate entrance and exit?'],
   array['component API design', 'accessibility', 'state management'],
   array['react', 'a11y', 'components']),
  ('Frontend Engineer', 'dsa', 'medium',
   'Given a stream of incoming user events, design a debounce utility. Discuss trade-offs against throttle.',
   array['How would you test this?', 'What edge cases exist for leading/trailing invocation?'],
   array['closures', 'timing correctness', 'testing mindset'],
   array['javascript', 'timing']),
  ('Backend Engineer', 'system_design', 'hard',
   'Design a URL shortener that serves 10k redirects per second with analytics.',
   array['How do you pick an ID encoding?', 'How do you keep analytics counters consistent?'],
   array['capacity planning', 'data modeling', 'caching strategy'],
   array['system-design', 'scale']),
  ('Backend Engineer', 'technical', 'medium',
   'Explain how you would design an idempotent payment API.',
   array['How would you store idempotency keys?', 'How long should they live?'],
   array['correctness under retries', 'storage choice', 'API ergonomics'],
   array['api', 'payments']),
  ('Full Stack Developer', 'behavioral', 'medium',
   'Tell me about a time you disagreed with a design decision on your team. How did you handle it?',
   array['What was the outcome?', 'What would you do differently?'],
   array['STAR structure', 'ownership', 'communication'],
   array['behavioral', 'teamwork']),
  ('Data Scientist', 'technical', 'medium',
   'How would you evaluate whether a new recommendation model is actually improving user engagement?',
   array['How do you pick a primary metric?', 'How do you detect novelty effects?'],
   array['experiment design', 'statistical rigor', 'product thinking'],
   array['experimentation', 'metrics']),
  ('ML Engineer', 'system_design', 'hard',
   'Design a training and serving pipeline for a production embedding model used in search.',
   array['How do you manage model versioning?', 'How would you do online evaluation?'],
   array['training/serving skew', 'versioning', 'observability'],
   array['ml-ops', 'search']),
  ('Product Manager', 'behavioral', 'medium',
   'Describe how you prioritize a backlog when engineering capacity is cut by 30 percent.',
   array['How do you communicate trade-offs to stakeholders?'],
   array['prioritization framework', 'stakeholder empathy', 'clarity'],
   array['prioritization', 'leadership']),
  ('DevOps Engineer', 'technical', 'medium',
   'Walk me through how you would diagnose a sudden latency spike on a Kubernetes-hosted API.',
   array['What metrics do you look at first?', 'When would you roll back vs debug forward?'],
   array['observability', 'systematic debugging', 'blast radius awareness'],
   array['kubernetes', 'observability']),
  ('Mobile Engineer', 'technical', 'easy',
   'Explain how you would persist a small amount of user preferences on iOS and Android.',
   array['What are the trade-offs of each choice?'],
   array['platform familiarity', 'simplicity', 'data sensitivity'],
   array['mobile', 'persistence'])
on conflict do nothing;
