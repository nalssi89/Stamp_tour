import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X, Check, Users, MessageSquare, Upload } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase'
import { ROUTES } from '../../constants'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function LunchRecord() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [myGroup, setMyGroup] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [comment, setComment] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [existingRecord, setExistingRecord] = useState(null)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (profile?.id) {
      fetchData()
    }
  }, [profile?.id])

  const fetchData = async () => {
    try {
      // 오늘 이미 인증했는지 확인
      const { data: record } = await supabase
        .from('lunch_records')
        .select(`
          *,
          lunch_participants (
            participant_id,
            profiles:participant_id (id, name, department)
          )
        `)
        .eq('recorder_id', profile.id)
        .eq('record_date', today)
        .single()

      if (record) {
        setExistingRecord(record)
        setSelectedParticipants(record.lunch_participants?.map(p => p.profiles) || [])
        setComment(record.comment || '')
        setPhotoPreview(record.photo_url)
      }

      // 오늘의 매칭 그룹 조회
      const { data: memberData } = await supabase
        .from('match_group_members')
        .select(`
          group_id,
          match_groups!inner (id, match_date, group_number)
        `)
        .eq('user_id', profile.id)
        .eq('match_groups.match_date', today)
        .single()

      if (memberData) {
        setMyGroup(memberData.match_groups)

        // 같은 그룹 멤버 조회
        const { data: members } = await supabase
          .from('match_group_members')
          .select('profiles:user_id (id, name, department)')
          .eq('group_id', memberData.group_id)
          .neq('user_id', profile.id)

        if (members) {
          setGroupMembers(members.map(m => m.profiles))
        }
      }

      // 전체 사용자 목록 (그룹 외 사람과 식사한 경우)
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, department')
        .eq('is_active', true)
        .neq('id', profile.id)
        .order('name')

      if (users) {
        setAllUsers(users)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleParticipantToggle = (user) => {
    setSelectedParticipants(prev => {
      const exists = prev.find(p => p.id === user.id)
      if (exists) {
        return prev.filter(p => p.id !== user.id)
      }
      return [...prev, user]
    })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('사진 크기는 5MB 이하여야 합니다')
        return
      }
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
  }

  const handleSubmit = async () => {
    if (selectedParticipants.length === 0) {
      setError('함께 식사한 사람을 최소 1명 선택해주세요')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      let photoUrl = existingRecord?.photo_url || null

      // 사진 업로드
      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${profile.id}/${today}_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('lunch-photos')
          .upload(fileName, photo)

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('lunch-photos')
            .getPublicUrl(fileName)
          photoUrl = publicUrl
        }
      }

      if (existingRecord) {
        // 기존 기록 업데이트
        const { error: updateError } = await supabase
          .from('lunch_records')
          .update({
            comment: comment || null,
            photo_url: photoUrl,
          })
          .eq('id', existingRecord.id)

        if (updateError) throw updateError

        // 참여자 삭제 후 재등록
        await supabase
          .from('lunch_participants')
          .delete()
          .eq('record_id', existingRecord.id)

        const participants = selectedParticipants.map(p => ({
          record_id: existingRecord.id,
          participant_id: p.id,
        }))

        const { error: participantError } = await supabase
          .from('lunch_participants')
          .insert(participants)

        if (participantError) throw participantError
      } else {
        // 새 기록 생성
        const { data: newRecord, error: insertError } = await supabase
          .from('lunch_records')
          .insert({
            recorder_id: profile.id,
            group_id: myGroup?.id || null,
            record_date: today,
            comment: comment || null,
            photo_url: photoUrl,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // 참여자 등록
        const participants = selectedParticipants.map(p => ({
          record_id: newRecord.id,
          participant_id: p.id,
        }))

        const { error: participantError } = await supabase
          .from('lunch_participants')
          .insert(participants)

        if (participantError) throw participantError
      }

      navigate(ROUTES.DASHBOARD)
    } catch (error) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">점심 인증</h1>
        <p className="text-gray-600 mt-1">
          {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
        </p>
        {existingRecord && (
          <span className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
            이미 인증 완료 (수정 가능)
          </span>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 함께 식사한 사람 선택 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          함께 식사한 사람
        </h2>

        {/* 오늘의 매칭 그룹 */}
        {groupMembers.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">오늘의 매칭 그룹</p>
            <div className="space-y-2">
              {groupMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleParticipantToggle(member)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedParticipants.find(p => p.id === member.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{member.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{member.department}</span>
                    {selectedParticipants.find(p => p.id === member.id) && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 다른 사람 선택 */}
        <div>
          <p className="text-sm text-gray-500 mb-2">
            {groupMembers.length > 0 ? '다른 동료와 식사했나요?' : '함께 식사한 동료 선택'}
          </p>
          <select
            onChange={(e) => {
              const user = allUsers.find(u => u.id === e.target.value)
              if (user && !selectedParticipants.find(p => p.id === user.id)) {
                handleParticipantToggle(user)
              }
              e.target.value = ''
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            defaultValue=""
          >
            <option value="" disabled>동료 선택...</option>
            {allUsers
              .filter(u => !groupMembers.find(m => m.id === u.id))
              .filter(u => !selectedParticipants.find(p => p.id === u.id))
              .map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.department})
                </option>
              ))}
          </select>
        </div>

        {/* 선택된 참여자 표시 */}
        {selectedParticipants.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">
              선택됨 ({selectedParticipants.length}명)
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedParticipants.map(p => (
                <span
                  key={p.id}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {p.name}
                  <button
                    onClick={() => handleParticipantToggle(p)}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 한줄평 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          한줄평 (선택)
        </h2>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="오늘 점심 어땠나요? (선택 사항)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-gray-500 text-right mt-1">
          {comment.length}/200
        </p>
      </div>

      {/* 사진 업로드 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Camera className="w-5 h-5 mr-2" />
          사진 (선택)
        </h2>

        {photoPreview ? (
          <div className="relative">
            <img
              src={photoPreview}
              alt="점심 사진"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              onClick={removePhoto}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">클릭하여 사진 업로드</p>
            <p className="text-xs text-gray-400">최대 5MB</p>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={submitting || selectedParticipants.length === 0}
        className="w-full py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? '저장 중...'
          : existingRecord
          ? '인증 수정하기'
          : '점심 인증하기'}
      </button>
    </div>
  )
}
