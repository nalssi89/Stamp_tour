-- 포인트 적립 사유 타입
CREATE TYPE point_reason AS ENUM (
  'match_request',    -- 매칭 신청 (+1)
  'lunch_verified',   -- 점심 인증 완료 (+3)
  'cross_dept',       -- 타과 인원과 식사 (+2/인당)
  'first_meet',       -- 처음 만나는 사람과 식사 (+3/인당)
  'comment',          -- 한줄평 작성 (+1)
  'photo'             -- 사진 업로드 (+1)
);

-- 포인트 이력 테이블
CREATE TABLE point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason point_reason NOT NULL,
  reference_id UUID,  -- 관련 record id (lunch_records.id 등)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 포인트 적립 시 profiles.total_points 자동 업데이트 트리거
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

-- 인덱스
CREATE INDEX idx_point_history_user_id ON point_history(user_id);
CREATE INDEX idx_point_history_created_at ON point_history(created_at);
CREATE INDEX idx_point_history_reason ON point_history(reason);
