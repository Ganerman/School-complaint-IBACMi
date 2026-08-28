-- Let reporters describe a facility issue that does not fit a predefined category.
insert into public.complaint_categories(name, description, is_active)
values ('Other', 'Facility concerns that do not match an existing category', true)
on conflict(name) do update
set description = excluded.description, is_active = true;

alter table public.complaints
add column other_category text
check (other_category is null or char_length(other_category) between 3 and 100);

create or replace function public.validate_complaint_other_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  selected_category text;
begin
  select c.name into selected_category
  from public.complaint_categories c
  where c.id = new.category_id;

  if lower(coalesce(selected_category, '')) = 'other' then
    new.other_category := nullif(btrim(coalesce(new.other_category, '')), '');
    if new.other_category is null or char_length(new.other_category) < 3 then
      raise exception 'Specify the other complaint category using at least 3 characters';
    end if;
  else
    new.other_category := null;
  end if;

  return new;
end;
$$;

create trigger complaints_validate_other_category
before insert or update of category_id, other_category
on public.complaints
for each row execute function public.validate_complaint_other_category();
