# SQL 마이그레이션

이 폴더의 `.sql` 파일은 main에 올라오면 GitHub Actions("Supabase DB 마이그레이션")가 자동으로 실행합니다.

- 파일 이름: `YYYYMMDDHHMMSS_설명.sql` (예: `20261001000000_raw_files_schema.sql`) — 이름 순서대로 한 번씩만 실행됨
- 이미 SQL Editor에서 직접 실행한 `supabase_schema.sql`, `data_migration.sql`은 넣지 않습니다(기준선).
- 새 SQL은 재실행해도 안전하게(`create table if not exists`, `on conflict do nothing` 등) 작성하는 것을 원칙으로 합니다.
