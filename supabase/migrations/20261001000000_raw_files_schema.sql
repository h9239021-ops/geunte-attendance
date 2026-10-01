-- =====================================================================
-- "원본 데이터" 탭 — 월별 원본 파일(가공 전) 보관 기능 추가
-- supabase_schema.sql을 이미 실행하셨다는 전제로, 이 파일을 SQL Editor에서
-- 한 번 더 실행하면 됩니다 (New query → 붙여넣고 → Run).
-- =====================================================================

-- 1) 파일 메타데이터 테이블 — 실제 파일 내용은 아래 2)의 Storage 버킷에 저장되고,
--    이 테이블에는 그 파일을 찾아가기 위한 정보(파일명·저장 경로·용량 등)만 남습니다.
create table if not exists public.geunte_raw_files (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  year text not null,
  month text not null,
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  content_type text,
  uploaded_by_email text,
  uploaded_by uuid references auth.users(id) default auth.uid(),
  uploaded_at timestamptz not null default now(),
  source_kind text  -- '출퇴근 현황' / '근로시간 현황' / '인원 현황'(근태 자동 필터링에서 자동 저장된 경우) / null(원본 데이터 탭에서 직접 올린 경우)
);
create index if not exists geunte_raw_files_scope_idx on public.geunte_raw_files (company, year, month);

-- 이 스키마를 이미 한 번 실행한 뒤에 source_kind 컬럼이 새로 추가된 경우를 위한 안전장치(재실행해도 안전).
alter table public.geunte_raw_files add column if not exists source_kind text;

alter table public.geunte_raw_files enable row level security;

-- mail_log와 동일한 기준: editor(편집 권한)만 열람/업로드/삭제 가능
-- (대시보드 공유 화면에는 애초에 노출되지 않는 내부 원본 자료라 viewer 접근 자체를 막습니다)
drop policy if exists "rawfiles_editor_only" on public.geunte_raw_files;
create policy "rawfiles_editor_only" on public.geunte_raw_files
  for all using (public.is_geunte_editor()) with check (public.is_geunte_editor());

-- 2) 실제 파일을 담을 비공개(private) Storage 버킷. 파일당 최대 20MB.
insert into storage.buckets (id, name, public, file_size_limit)
values ('geunte-raw-files', 'geunte-raw-files', false, 20971520)
on conflict (id) do nothing;

-- 3) 버킷 접근 권한 — 이 버킷 안에서는 editor만 읽기 · 올리기 · 삭제 가능
drop policy if exists "geunte_raw_files_select" on storage.objects;
create policy "geunte_raw_files_select" on storage.objects
  for select using (bucket_id = 'geunte-raw-files' and public.is_geunte_editor());

drop policy if exists "geunte_raw_files_insert" on storage.objects;
create policy "geunte_raw_files_insert" on storage.objects
  for insert with check (bucket_id = 'geunte-raw-files' and public.is_geunte_editor());

drop policy if exists "geunte_raw_files_delete" on storage.objects;
create policy "geunte_raw_files_delete" on storage.objects
  for delete using (bucket_id = 'geunte-raw-files' and public.is_geunte_editor());
