-- 점심 인증 기록 테이블
CREATE TABLE lunch_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES match_groups(id) ON DELETE SET NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  comment TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 점심 참여자 테이블 (함께 식사한 사람들)
CREATE TABLE lunch_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES lunch_records(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 같은 기록에 같은 참여자 중복 방지
  UNIQUE(record_id, participant_id)
);

-- 인덱스
CREATE INDEX idx_lunch_records_recorder_id ON lunch_records(recorder_id);
CREATE INDEX idx_lunch_records_record_date ON lunch_records(record_date);
CREATE INDEX idx_lunch_records_group_id ON lunch_records(group_id);
CREATE INDEX idx_lunch_participants_record_id ON lunch_participants(record_id);
CREATE INDEX idx_lunch_participants_participant_id ON lunch_participants(participant_id);
