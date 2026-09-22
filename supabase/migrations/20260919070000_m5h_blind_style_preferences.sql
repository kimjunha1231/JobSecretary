-- M5-h: explicit user preference capture for blind answer comparisons.
-- Answer text is never copied here; only hashes, variant assignment and the user's choice are stored.

create table if not exists public.style_evaluation_preferences (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    case_id uuid not null references public.style_evaluation_cases(id) on delete cascade,
    left_variant text not null check (left_variant in ('studio', 'baseline')),
    right_variant text not null check (right_variant in ('studio', 'baseline')),
    left_answer_hash text not null check (left_answer_hash ~ '^[a-f0-9]{64}$'),
    right_answer_hash text not null check (right_answer_hash ~ '^[a-f0-9]{64}$'),
    selected_side text check (selected_side is null or selected_side in ('left', 'right')),
    selected_variant text check (selected_variant is null or selected_variant in ('studio', 'baseline')),
    created_at timestamptz not null default timezone('utc', now()),
    responded_at timestamptz,
    check (left_variant <> right_variant),
    check (left_answer_hash <> right_answer_hash),
    check ((selected_side is null and selected_variant is null and responded_at is null)
        or (selected_side is not null and selected_variant is not null and responded_at is not null)),
    check (selected_side is null
        or (selected_side = 'left' and selected_variant = left_variant)
        or (selected_side = 'right' and selected_variant = right_variant))
);

create index if not exists style_evaluation_preferences_case_idx
    on public.style_evaluation_preferences(user_id, case_id, created_at desc);

grant select, insert, update on table public.style_evaluation_preferences to authenticated;

alter table public.style_evaluation_preferences enable row level security;
alter table public.style_evaluation_preferences force row level security;

drop policy if exists "style_evaluation_preferences_own" on public.style_evaluation_preferences;
create policy "style_evaluation_preferences_own" on public.style_evaluation_preferences
    for all to authenticated
    using (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_evaluation_cases evaluation_case
            where evaluation_case.id = style_evaluation_preferences.case_id
              and evaluation_case.user_id = auth.uid()
        )
    )
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_evaluation_cases evaluation_case
            where evaluation_case.id = style_evaluation_preferences.case_id
              and evaluation_case.user_id = auth.uid()
        )
    );
