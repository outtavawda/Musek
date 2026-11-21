-- MUSEK SOCIAL FEED: posts, media storage, likes and comments.
-- Apply in Supabase Dashboard > SQL Editor before using the Social Feed.

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 2200),
  post_type text not null default 'text' check (post_type in ('text', 'image', 'video', 'music')),
  media_url text,
  media_type text,
  music_url text,
  music_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (post_type = 'text' and media_url is null) or
    (post_type in ('image', 'video') and media_url is not null) or
    (post_type = 'music' and music_url is not null)
  )
);

create index if not exists social_posts_created_idx
  on public.social_posts(created_at desc);
create index if not exists social_posts_user_created_idx
  on public.social_posts(user_id, created_at desc);

create table if not exists public.social_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);
create index if not exists social_post_likes_post_idx
  on public.social_post_likes(post_id);

create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null check (char_length(comment) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists social_post_comments_post_created_idx
  on public.social_post_comments(post_id, created_at);

alter table public.social_posts enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.social_post_comments enable row level security;

drop policy if exists "Authenticated users can read social posts" on public.social_posts;
create policy "Authenticated users can read social posts"
  on public.social_posts for select to authenticated using (true);
drop policy if exists "Users can create their own social posts" on public.social_posts;
create policy "Users can create their own social posts"
  on public.social_posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own social posts" on public.social_posts;
create policy "Users can update their own social posts"
  on public.social_posts for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own social posts" on public.social_posts;
create policy "Users can delete their own social posts"
  on public.social_posts for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read social post likes" on public.social_post_likes;
create policy "Authenticated users can read social post likes"
  on public.social_post_likes for select to authenticated using (true);
drop policy if exists "Users can like posts as themselves" on public.social_post_likes;
create policy "Users can like posts as themselves"
  on public.social_post_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can remove their own post likes" on public.social_post_likes;
create policy "Users can remove their own post likes"
  on public.social_post_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read social post comments" on public.social_post_comments;
create policy "Authenticated users can read social post comments"
  on public.social_post_comments for select to authenticated using (true);
drop policy if exists "Users can comment as themselves" on public.social_post_comments;
create policy "Users can comment as themselves"
  on public.social_post_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own social post comments" on public.social_post_comments;
create policy "Users can delete their own social post comments"
  on public.social_post_comments for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.social_posts to authenticated;
grant select, insert, delete on public.social_post_likes to authenticated;
grant select, insert, delete on public.social_post_comments to authenticated;

-- Public bucket allows feed media to render for signed-in and signed-out viewers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'social-posts',
  'social-posts',
  true,
  104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Social post media is publicly readable" on storage.objects;
create policy "Social post media is publicly readable"
  on storage.objects for select to public using (bucket_id = 'social-posts');
drop policy if exists "Users can upload their own social post media" on storage.objects;
create policy "Users can upload their own social post media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'social-posts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can update their own social post media" on storage.objects;
create policy "Users can update their own social post media"
  on storage.objects for update to authenticated
  using (bucket_id = 'social-posts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'social-posts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own social post media" on storage.objects;
create policy "Users can delete their own social post media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'social-posts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime updates for new posts and engagement.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_posts'
  ) then alter publication supabase_realtime add table public.social_posts; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_post_likes'
  ) then alter publication supabase_realtime add table public.social_post_likes; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_post_comments'
  ) then alter publication supabase_realtime add table public.social_post_comments; end if;
end $$;
