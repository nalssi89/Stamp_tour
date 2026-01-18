import { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit2, Trash2, Check, X, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { DEPARTMENTS } from '../../constants'

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: DEPARTMENTS[0],
    employee_number: '',
    is_active: true,
  })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDept = filterDept === 'all' || emp.department === filterDept
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && emp.is_active) ||
      (filterStatus === 'inactive' && !emp.is_active)

    return matchesSearch && matchesDept && matchesStatus
  })

  const handleAddEmployee = () => {
    setFormData({
      name: '',
      email: '',
      department: DEPARTMENTS[0],
      employee_number: '',
      is_active: true,
    })
    setFormError('')
    setShowAddModal(true)
  }

  const handleEditEmployee = (employee) => {
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      department: employee.department || DEPARTMENTS[0],
      employee_number: employee.employee_number || '',
      is_active: employee.is_active,
    })
    setFormError('')
    setEditingEmployee(employee)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      if (!formData.name.trim()) {
        throw new Error('이름을 입력해주세요')
      }

      if (editingEmployee) {
        // 수정
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formData.name.trim(),
            department: formData.department,
            employee_number: formData.employee_number.trim() || null,
            is_active: formData.is_active,
          })
          .eq('id', editingEmployee.id)

        if (error) throw error
        setEditingEmployee(null)
      } else {
        // 신규 추가 (관리자가 직접 프로필만 생성 - 실제 로그인은 사용자가 가입해야 함)
        // 이 경우 auth.users 없이 profiles만 생성하므로 id를 UUID로 생성
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            department: formData.department,
            employee_number: formData.employee_number.trim() || null,
            is_active: formData.is_active,
          })

        if (error) throw error
        setShowAddModal(false)
      }

      fetchEmployees()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (employee) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employee.id)

      if (error) throw error

      setDeleteConfirm(null)
      fetchEmployees()
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('삭제 중 오류가 발생했습니다: ' + error.message)
    }
  }

  const handleToggleActive = async (employee) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id)

      if (error) throw error
      fetchEmployees()
    } catch (error) {
      console.error('Error updating status:', error)
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center">
          <Users className="w-7 h-7 mr-2" />
          직원 관리
        </h1>
        <p className="mt-1 text-blue-100">
          총 {employees.length}명 / 활성 {employees.filter(e => e.is_active).length}명
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="이름, 이메일, 사번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">전체 부서</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">전체 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
          <button
            onClick={handleAddEmployee}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-1" />
            직원 추가
          </button>
        </div>
      </div>

      {/* 직원 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">이메일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">부서</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">사번</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">포인트</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                          {employee.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{employee.name}</span>
                        {employee.is_admin && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">관리자</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{employee.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        employee.department === '기획과'
                          ? 'bg-purple-100 text-purple-700'
                          : employee.department === '기술과'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {employee.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{employee.employee_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{employee.total_points || 0}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(employee)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          employee.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {employee.is_active ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditEmployee(employee)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(employee)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterDept !== 'all' || filterStatus !== 'all'
                ? '검색 결과가 없습니다'
                : '등록된 직원이 없습니다'}
            </p>
          </div>
        )}
      </div>

      {/* 추가/수정 모달 */}
      {(showAddModal || editingEmployee) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                {editingEmployee ? (
                  <>
                    <Edit2 className="w-5 h-5 mr-2" />
                    직원 정보 수정
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    새 직원 추가
                  </>
                )}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  부서 *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사번
                </label>
                <input
                  type="text"
                  value={formData.employee_number}
                  onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  활성 상태
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingEmployee(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">직원 삭제</h3>
            <p className="text-gray-600 mb-4">
              <strong>{deleteConfirm.name}</strong>님을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-red-600">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
