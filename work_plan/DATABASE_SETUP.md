# 데이터베이스 설정 가이드

## Supabase SQL Editor에서 실행할 전체 SQL

아래 SQL을 Supabase 대시보드의 **SQL Editor**에서 실행하세요.

```sql
-- ============================================
-- 1. 타입 생성
-- ============================================

CREATE TYPE department_type AS ENUM ('수치예보기획과', '수치예보기술과', '수치예보활용팀');
CREATE TYPE match_status AS ENUM ('pending', 'matched', 'cancelled');
CREATE TYPE point_reason AS ENUM (
  'match_request',
  'lunch_verified',
  'cross_dept',
  'first_meet',
  'comment',
  'photo'
);

-- ============================================
-- 2. profiles 테이블
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50),
  email VARCHAR(255),
  department department_type,
  employee_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_profiles_department ON profiles(department);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- ============================================
-- 3. 매칭 테이블
-- ============================================

CREATE TABLE match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status match_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, request_date)
);

CREATE TABLE match_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date DATE NOT NULL,
  group_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_date, group_number)
);

CREATE TABLE match_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES match_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_match_requests_user_id ON match_requests(user_id);
CREATE INDEX idx_match_requests_request_date ON match_requests(request_date);
CREATE INDEX idx_match_requests_status ON match_requests(status);
CREATE INDEX idx_match_groups_match_date ON match_groups(match_date);
CREATE INDEX idx_match_group_members_group_id ON match_group_members(group_id);
CREATE INDEX idx_match_group_members_user_id ON match_group_members(user_id);

-- ============================================
-- 4. 점심 기록 테이블
-- ============================================

CREATE TABLE lunch_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES match_groups(id) ON DELETE SET NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  comment TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lunch_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES lunch_records(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(record_id, participant_id)
);

CREATE INDEX idx_lunch_records_recorder_id ON lunch_records(recorder_id);
CREATE INDEX idx_lunch_records_record_date ON lunch_records(record_date);
CREATE INDEX idx_lunch_records_group_id ON lunch_records(group_id);
CREATE INDEX idx_lunch_participants_record_id ON lunch_participants(record_id);
CREATE INDEX idx_lunch_participants_participant_id ON lunch_participants(participant_id);

-- ============================================
-- 5. 포인트 히스토리 테이블
-- ============================================

CREATE TABLE point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason point_reason NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_total_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_points = total_points + NEW.points
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_point_added
  AFTER INSERT ON point_history
  FOR EACH ROW
  EXECUTE FUNCTION update_total_points();

CREATE INDEX idx_point_history_user_id ON point_history(user_id);
CREATE INDEX idx_point_history_created_at ON point_history(created_at);

-- ============================================
-- 6. RLS 비활성화 (개발용)
-- ============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_history DISABLE ROW LEVEL SECURITY;
```

---

## 관리자 설정

```sql
-- 특정 사용자를 관리자로 설정
UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com';

-- 전체 사용자 확인
SELECT id, email, name, department, is_admin FROM profiles;
```

---

## 테스트 데이터 추가 (선택)

```sql
-- 테스트용 부서별 사용자 추가 (프로필만 - 실제 로그인은 불가)
INSERT INTO profiles (id, name, email, department, is_active) VALUES
  (gen_random_uuid(), '김기획', 'kim@test.com', '수치예보기획과', true),
  (gen_random_uuid(), '이기획', 'lee@test.com', '수치예보기획과', true),
  (gen_random_uuid(), '박기술', 'park@test.com', '수치예보기술과', true),
  (gen_random_uuid(), '최기술', 'choi@test.com', '수치예보기술과', true),
  (gen_random_uuid(), '정활용', 'jung@test.com', '수치예보활용팀', true),
  (gen_random_uuid(), '한활용', 'han@test.com', '수치예보활용팀', true);
```

---

## Storage 버킷 생성

Supabase 대시보드에서:
1. **Storage** 메뉴 클릭
2. **New bucket** 클릭
3. 버킷 이름: `lunch-photos`
4. **Public bucket** 체크
5. **Create bucket** 클릭

---

## 배포 시 RLS 활성화

배포 전에 아래 SQL로 RLS를 활성화하세요:

```sql
-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- 기본 정책 생성 (예시)
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 나머지 테이블도 유사하게 정책 추가 필요
```
