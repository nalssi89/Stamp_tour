import { useState, useEffect } from 'react'
import { Shuffle, Users, Calendar, Play, Check, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MATCH_STATUS } from '../../constants'
import { createMatchGroups } from '../../utils/matchingAlgorithm'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function MatchingManagement() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [requests, setRequests] = useState([])
  const [matchGroups, setMatchGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      // 매칭 신청 목록 조회
      const { data: requestData, error: requestError } = await supabase
        .from('match_requests')
        .select(`
          *,
          profiles:user_id (id, name, department, employee_number)
        `)
        .eq('request_date', selectedDate)
        .neq('status', MATCH_STATUS.CANCELLED)
        .order('created_at')

      if (requestError) throw requestError
      setRequests(requestData || [])

      // 매칭 그룹 조회
      const { data: groupData, error: groupError } = await supabase
        .from('match_groups')
        .select(`
          *,
          match_group_members (
            user_id,
            profiles:user_id (id, name, department)
          )
        `)
        .eq('match_date', selectedDate)
        .order('group_number')

      if (groupError) throw groupError
      setMatchGroups(groupData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('데이터 조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleRunMatching = async () => {
    if (requests.length < 3) {
      setError('매칭을 실행하려면 최소 3명이 필요합니다')
      return
    }

    setMatching(true)
    setError('')
    setSuccess('')

    try {
      // 이미 매칭된 그룹이 있으면 삭제
      if (matchGroups.length > 0) {
        const groupIds = matchGroups.map(g => g.id)

        // 그룹 멤버 삭제
        await supabase
          .from('match_group_members')
          .delete()
          .in('group_id', groupIds)

        // 그룹 삭제
        await supabase
          .from('match_groups')
          .delete()
          .in('id', groupIds)

        // 요청 상태 초기화
        await supabase
          .from('match_requests')
          .update({ status: MATCH_STATUS.PENDING })
          .eq('request_date', selectedDate)
          .neq('status', MATCH_STATUS.CANCELLED)
      }

      // 매칭 알고리즘 실행
      const users = requests.map(r => r.profiles)
      const groups = createMatchGroups(users)

      // 그룹 생성
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i]

        // match_groups 테이블에 그룹 생성
        const { data: newGroup, error: groupError } = await supabase
          .from('match_groups')
          .insert({
            match_date: selectedDate,
            group_number: i + 1,
          })
          .select()
          .single()

        if (groupError) throw groupError

        // match_group_members 테이블에 멤버 추가
        const members = group.map(user => ({
          group_id: newGroup.id,
          user_id: user.id,
        }))

        const { error: memberError } = await supabase
          .from('match_group_members')
          .insert(members)

        if (memberError) throw memberError

        // match_requests 상태 업데이트
        const userIds = group.map(u => u.id)
        await supabase
          .from('match_requests')
          .update({ status: MATCH_STATUS.MATCHED })
          .eq('request_date', selectedDate)
          .in('user_id', userIds)
      }

      setSuccess(`${groups.length}개 그룹 매칭 완료!`)
      fetchData()
    } catch (error) {
      console.error('Matching error:', error)
      setError('매칭 실행 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setMatching(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case MATCH_STATUS.PENDING:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">대기중</span>
      case MATCH_STATUS.MATCHED:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">매칭완료</span>
      case MATCH_STATUS.CANCELLED:
        return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">취소됨</span>
      default:
        return null
    }
  }

  const pendingCount = requests.filter(r => r.status === MATCH_STATUS.PENDING).length
  const matchedCount = requests.filter(r => r.status === MATCH_STATUS.MATCHED).length

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
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center">
          <Shuffle className="w-7 h-7 mr-2" />
          매칭 관리
        </h1>
        <p className="mt-1 text-green-100">
          랜덤 점심 그룹 매칭 실행
        </p>
      </div>

      {/* 날짜 선택 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <span className="text-gray-600">
            {format(new Date(selectedDate), 'EEEE', { locale: ko })}
          </span>
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 에러/성공 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg flex items-center">
          <Check className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {/* 현황 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
          <p className="text-sm text-gray-500">총 신청</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">대기중</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
          <p className="text-sm text-gray-500">매칭완료</p>
        </div>
      </div>

      {/* 매칭 실행 버튼 */}
      <button
        onClick={handleRunMatching}
        disabled={matching || pendingCount < 3}
        className="w-full py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {matching ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2" />
            매칭 진행 중...
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2" />
            {matchGroups.length > 0 ? '매칭 다시 실행' : '매칭 실행'}
            {pendingCount > 0 && ` (${pendingCount}명)`}
          </>
        )}
      </button>

      {pendingCount > 0 && pendingCount < 3 && (
        <p className="text-sm text-center text-yellow-600">
          매칭을 실행하려면 최소 3명이 필요합니다 (현재 {pendingCount}명)
        </p>
      )}

      {/* 매칭 그룹 결과 */}
      {matchGroups.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              매칭 결과 ({matchGroups.length}개 그룹)
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {matchGroups.map((group) => {
              const departments = new Set(group.match_group_members?.map(m => m.profiles?.department))
              const hasCrossDept = departments.size >= 2

              return (
                <div key={group.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      그룹 {group.group_number}
                    </h3>
                    {hasCrossDept && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                        타과 교류
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.match_group_members?.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg"
                      >
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                          {member.profiles?.name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{member.profiles?.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          member.profiles?.department === '기획과'
                            ? 'bg-purple-100 text-purple-700'
                            : member.profiles?.department === '기술과'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {member.profiles?.department}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 신청자 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            신청자 목록 ({requests.length}명)
          </h2>
        </div>

        {requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">부서</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">신청 시간</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {request.profiles?.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{request.profiles?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        request.profiles?.department === '기획과'
                          ? 'bg-purple-100 text-purple-700'
                          : request.profiles?.department === '기술과'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {request.profiles?.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(new Date(request.created_at), 'HH:mm', { locale: ko })}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(request.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">해당 날짜에 매칭 신청이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
