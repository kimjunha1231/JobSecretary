-- M6-n: distinguish professional credentials and language scores from education or awards.

alter table public.career_items
    drop constraint if exists career_items_kind_check;

alter table public.career_items
    add constraint career_items_kind_check
    check (kind in ('project', 'work', 'education', 'credential', 'award', 'leadership', 'community', 'other'));
