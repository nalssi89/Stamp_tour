import { MATCHING_CONFIG } from '../constants'

/**
 * 랜덤 점심 매칭 알고리즘
 *
 * 규칙:
 * 1. 그룹당 3~4명
 * 2. 각 그룹에 최소 2개 과 인원 포함 (가능한 경우)
 * 3. 가능하면 이전에 안 만난 조합 우선 (향후 구현)
 */

/**
 * 배열을 랜덤하게 섞는 함수 (Fisher-Yates shuffle)
 */
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * 신청자들을 부서별로 분류
 */
function groupByDepartment(requesters) {
  return requesters.reduce((acc, person) => {
    const dept = person.department
    if (!acc[dept]) {
      acc[dept] = []
    }
    acc[dept].push(person)
    return acc
  }, {})
}

/**
 * 메인 매칭 알고리즘
 * @param {Array} requesters - 신청자 목록 [{id, name, department}, ...]
 * @returns {Array} 매칭 그룹 배열 [[member1, member2, member3], ...]
 */
export function createMatchGroups(requesters) {
  if (requesters.length < 2) {
    // 2명 미만이면 그룹 생성 불가
    return requesters.length === 1 ? [[requesters[0]]] : []
  }

  const { MIN_GROUP_SIZE, MAX_GROUP_SIZE } = MATCHING_CONFIG

  // 1. 부서별로 분류하고 각 부서 내에서 셔플
  const byDepartment = groupByDepartment(requesters)
  const departments = Object.keys(byDepartment)

  departments.forEach(dept => {
    byDepartment[dept] = shuffleArray(byDepartment[dept])
  })

  const groups = []

  // 2. Round-Robin 방식으로 그룹 생성 (타과 교류 최대화)
  if (departments.length >= 2) {
    // 부서가 2개 이상인 경우: 타과 교류 우선
    const queues = {}
    departments.forEach(dept => {
      queues[dept] = [...byDepartment[dept]]
    })

    // 그룹 생성
    while (true) {
      const group = []
      const availableDepts = departments.filter(dept => queues[dept].length > 0)

      if (availableDepts.length === 0) break

      // 각 부서에서 한 명씩 선택 (최대 그룹 사이즈까지)
      for (const dept of shuffleArray(availableDepts)) {
        if (queues[dept].length > 0 && group.length < MAX_GROUP_SIZE) {
          group.push(queues[dept].shift())
        }
      }

      // 그룹이 최소 인원을 충족하면 추가
      if (group.length >= MIN_GROUP_SIZE) {
        groups.push(group)
      } else if (group.length > 0) {
        // 남은 인원을 기존 그룹에 분배
        group.forEach(person => {
          const targetGroup = groups.find(g => g.length < MAX_GROUP_SIZE)
          if (targetGroup) {
            targetGroup.push(person)
          } else {
            // 모든 그룹이 꽉 찼으면 새 그룹 생성
            if (groups.length > 0 && group.length < MIN_GROUP_SIZE) {
              groups[groups.length - 1].push(person)
            } else {
              groups.push([person])
            }
          }
        })
      }
    }
  } else {
    // 부서가 1개인 경우: 같은 부서 내에서 그룹 생성
    const allPeople = shuffleArray(requesters)

    while (allPeople.length > 0) {
      const groupSize = Math.min(
        allPeople.length >= MIN_GROUP_SIZE * 2 ? MIN_GROUP_SIZE : allPeople.length,
        MAX_GROUP_SIZE
      )
      groups.push(allPeople.splice(0, groupSize))
    }
  }

  // 3. 후처리: 2명 이하 그룹 병합
  const finalGroups = []
  let smallGroup = []

  for (const group of groups) {
    if (group.length < MIN_GROUP_SIZE) {
      smallGroup.push(...group)
    } else {
      finalGroups.push(group)
    }
  }

  // 남은 인원 분배
  while (smallGroup.length > 0) {
    const person = smallGroup.shift()
    const targetGroup = finalGroups.find(g => g.length < MAX_GROUP_SIZE)

    if (targetGroup) {
      targetGroup.push(person)
    } else if (smallGroup.length > 0) {
      // 새 그룹 생성
      finalGroups.push([person, ...smallGroup.splice(0, MIN_GROUP_SIZE - 1)])
    } else {
      // 마지막 한 명은 가장 작은 그룹에 추가
      if (finalGroups.length > 0) {
        const smallestGroup = finalGroups.reduce((min, g) =>
          g.length < min.length ? g : min
        )
        smallestGroup.push(person)
      } else {
        finalGroups.push([person])
      }
    }
  }

  return finalGroups
}

/**
 * 그룹의 타과 교류 점수 계산
 */
export function calculateDiversityScore(group) {
  const departments = new Set(group.map(m => m.department))
  return departments.size
}

/**
 * 전체 매칭의 품질 점수 계산
 */
export function calculateMatchingQuality(groups) {
  if (groups.length === 0) return 0

  const totalScore = groups.reduce((sum, group) => {
    const diversityScore = calculateDiversityScore(group)
    const sizeScore = group.length >= 3 ? 1 : 0.5
    return sum + (diversityScore * sizeScore)
  }, 0)

  return totalScore / groups.length
}
