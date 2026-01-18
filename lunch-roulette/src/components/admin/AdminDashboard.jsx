import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Shuffle, BarChart3, Calendar, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ROUTES, MATCH_STATUS } from '../../constants'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    todayRequests: 0,
    todayMatched: 0,
    todayVerified: 0,
  })
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // 전체 직원 수
      const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // 활성 직원 수
      const { count: activeEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // 오늘 매칭 신청 수
      const { count: todayRequests } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('request_date', today)
        .neq('status', MATCH_STATUS.CANCELLED)

      // 오늘 매칭 완료 수
      const { count: todayMatched } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('request_date', today)
        .eq('status', MATCH_STATUS.MATCHED)

      // 오늘 인증 완료 수
      const { count: todayVerified } = await supabase
        .from('lunch_records')
        .select('*', { count: 'exact', head: true })
        .eq('record_date', today)

      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        todayRequests: todayRequests || 0,
        todayMatched: todayMatched || 0,
        todayVerified: todayVerified || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="mt-1 text-indigo-100">
          {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}
        </p>
      </div>

      {/* 오늘 현황 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          오늘 현황
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.todayRequests}</p>
            <p className="text-sm text-gray-500">매칭 신청</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.todayMatched}</p>
            <p className="text-sm text-gray-500">매칭 완료</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.todayVerified}</p>
            <p className="text-sm text-gray-500">인증 완료</p>
          </div>
        </div>
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to={ROUTES.ADMIN_EMPLOYEES}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <Users className="w-10 h-10 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">직원 관리</h3>
          <p className="text-sm text-gray-500 mt-1">
            {stats.activeEmployees}명 활성 / {stats.totalEmployees}명 전체
          </p>
        </Link>

        <Link
          to={ROUTES.ADMIN_MATCHING}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-green-300 hover:shadow-md transition-all"
        >
          <Shuffle className="w-10 h-10 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">매칭 관리</h3>
          <p className="text-sm text-gray-500 mt-1">
            매칭 실행 및 결과 관리
          </p>
        </Link>

        <Link
          to={ROUTES.ADMIN_STATS}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all"
        >
          <BarChart3 className="w-10 h-10 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">통계 조회</h3>
          <p className="text-sm text-gray-500 mt-1">
            일별/월별 통계 확인
          </p>
        </Link>
      </div>

      {/* 시스템 정보 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">시스템 정보</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">매칭 마감 시간</span>
            <span className="font-medium">오전 11시</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">그룹 인원 수</span>
            <span className="font-medium">3~4명</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">등록된 부서</span>
            <span className="font-medium">기획과, 기술과, 활용팀</span>
          </div>
        </div>
      </div>
    </div>
  )
}
