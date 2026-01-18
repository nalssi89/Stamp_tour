-- 매칭 요청 상태 타입
CREATE TYPE match_status AS ENUM ('pending', 'matched', 'cancelled');

-- 매칭 요청 테이블
CREATE TABLE match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status match_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 날짜에 같은 사용자가 중복 신청 방지
  UNIQUE(user_id, request_date)
);

-- 매칭 그룹 테이블
CREATE TABLE match_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date DATE NOT NULL,
  group_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 날짜에 같은 그룹 번호 중복 방지
  UNIQUE(match_date, group_number)
);

-- 매칭 그룹 멤버 테이블
CREATE TABLE match_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES match_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 같은 그룹에 같은 사용자 중복 방지
  UNIQUE(group_id, user_id)
);

-- 인덱스
CREATE INDEX idx_match_requests_user_id ON match_requests(user_id);
CREATE INDEX idx_match_requests_request_date ON match_requests(request_date);
CREATE INDEX idx_match_requests_status ON match_requests(status);
CREATE INDEX idx_match_groups_match_date ON match_groups(match_date);
CREATE INDEX idx_match_group_members_group_id ON match_group_members(group_id);
CREATE INDEX idx_match_group_members_user_id ON match_group_members(user_id);
