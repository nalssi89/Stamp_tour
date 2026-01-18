import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { supabase } from '../../lib/supabase'
import { MATCH_STATUS, MATCHING_CONFIG } from '../../constants'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function MatchRequest() {
  const { profile } = useAuth()
  const [todayRequest, setTodayRequest] = useState(null)
  const [todayRequesters, setTodayRequesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')
  const currentHour = new Date().getHours()
  const isBeforeDeadline = currentHour < MATCHING_CONFIG.DEADLINE_HOUR

  useEffect(() => {
    fetchData()

    // 실시간 구독
    const channel = supabase
      .channel('match_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_requests',
          filter: `request_date=eq.${today}`,
        },
        () => {
          fetchTodayRequesters()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  const fetchData = async () => {
    await Promise.all([fetchTodayRequest(), fetchTodayRequesters()])
    setLoading(false)
  }

  const fetchTodayRequest = async () => {
    if (!profile?.id) return

    const { data, error } = await supabase
      .from('match_requests')
      .select('*')
      .eq('user_id', profile.id)
      .eq('request_date', today)
      .single()

    if (!error) {
      setTodayRequest(data)
    }
  }

  const fetchTodayRequesters = async () => {
    const { data, error } = await supabase
      .from('match_requests')
      .select(`
        id,
        status,
        profiles:user_id (
          id,
          name,
          department
        )
      `)
      .eq('request_date', today)
      .neq('status', MATCH_STATUS.CANCELLED)

    if (!error && data) {
      setTodayRequesters(data)
    }
  }

  const handleRequest = async () => {
    if (!profile?.id) return
    setSubmitting(true)
    setError('')

    const { data, error } = await supabase
      .from('match_requests')
      .insert({
        user_id: profile.id,
        request_date: today,
        status: MATCH_STATUS.PENDING,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        setError('이미 오늘 매칭을 신청했습니다.')
      } else {
        setError(error.message)
      }
    } else {
      setTodayRequest(data)
    }
    setSubmitting(false)
  }

  const handleCancel = async () => {
    if (!todayRequest?.id) return
    setSubmitting(true)
    setError('')

    const { error } = await supabase
      .from('match_requests')
      .update({ status: MATCH_STATUS.CANCELLED })
      .eq('id', todayRequest.id)

    if (error) {
      setError(error.message)
    } else {
      setTodayRequest({ ...todayRequest, status: MATCH_STATUS.CANCELLED })
    }
    setSubmitting(false)
  }

  // 부서별 신청자 수 계산
  const departmentCounts = todayRequesters.reduce((acc, req) => {
    const dept = req.profiles?.department
    if (dept) {
      acc[dept] = (acc[dept] || 0) + 1
    }
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  const hasActiveRequest = todayRequest && todayRequest.status !== MATCH_STATUS.CANCELLED
  const isMatched = todayRequest?.status === MATCH_STATUS.MATCHED

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">오늘의 점심 매칭</h1>
          <span className="text-sm text-gray-500">
            {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
          </span>
        </div>

        {/* 마감 시간 안내 */}
        <div className={`flex items-center space-x-2 text-sm ${isBeforeDeadline ? 'text-blue-600' : 'text-orange-600'}`}>
          <Clock className="w-4 h-4" />
          <span>
            {isBeforeDeadline
              ? `매칭 신청 마감: 오전 ${MATCHING_CONFIG.DEADLINE_HOUR}시`
              : '오늘 매칭 신청이 마감되었습니다'}
          </span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* 신청 상태 카드 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {isMatched ? (
          <div className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">매칭 완료!</h2>
            <p className="text-gray-600 mt-2">매칭 결과를 확인하세요</p>
          </div>
        ) : hasActiveRequest ? (
          <div className="text-center py-4">
            <div className="relative">
              <div className="animate-pulse">
                <Users className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">매칭 대기 중</h2>
            <p className="text-gray-600 mt-2">
              {MATCHING_CONFIG.DEADLINE_HOUR}시에 매칭 결과가 발표됩니다
            </p>
            {isBeforeDeadline && (
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="mt-4 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                {submitting ? '취소 중...' : '신청 취소'}
              </button>
            )}
          </div>
        ) : todayRequest?.status === MATCH_STATUS.CANCELLED ? (
          <div className="text-center py-4">
            <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">신청 취소됨</h2>
            <p className="text-gray-600 mt-2">오늘 매칭 신청을 취소했습니다</p>
            {isBeforeDeadline && (
              <button
                onClick={handleRequest}
                disabled={submitting}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '신청 중...' : '다시 신청하기'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">매칭 신청하기</h2>
            <p className="text-gray-600 mt-2">
              오늘 점심, 새로운 동료와 함께하세요!
            </p>
            {isBeforeDeadline ? (
              <button
                onClick={handleRequest}
                disabled={submitting}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {submitting ? '신청 중...' : '매칭 신청'}
              </button>
            ) : (
              <p className="mt-4 text-orange-600 text-sm">
                오늘 신청 마감 시간이 지났습니다
              </p>
            )}
          </div>
        )}
      </div>

      {/* 오늘 신청자 현황 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          오늘 신청 현황
          <span className="ml-2 text-blue-600">{todayRequesters.length}명</span>
        </h2>

        {/* 부서별 통계 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['기획과', '기술과', '활용팀'].map((dept) => (
            <div
              key={dept}
              className="bg-gray-50 rounded-lg p-3 text-center"
            >
              <p className="text-2xl font-bold text-gray-900">
                {departmentCounts[dept] || 0}
              </p>
              <p className="text-xs text-gray-500">{dept}</p>
            </div>
          ))}
        </div>

        {/* 신청자 목록 */}
        {todayRequesters.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todayRequesters.map((req) => (
              <div
                key={req.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  req.profiles?.id === profile?.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50'
                }`}
              >
                <span className="font-medium text-gray-900">
                  {req.profiles?.name}
                  {req.profiles?.id === profile?.id && (
                    <span className="ml-2 text-xs text-blue-600">(나)</span>
                  )}
                </span>
                <span className="text-sm text-gray-500 px-2 py-0.5 bg-white rounded">
                  {req.profiles?.department}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            아직 신청자가 없습니다
          </p>
        )}
      </div>
    </div>
  )
}
