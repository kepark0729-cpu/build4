import { addDays, businessDaysAgo, type DateStr, type Status } from './dates'

// 일반적인 인사 업무 구분이다. 회사 기준이 아니다. (PRD 6절)
export const INITIAL_CATEGORIES = [
  '채용',
  '급여 및 4대보험',
  '복리후생',
  '노무',
  '인사기획',
  '평가 · 보상',
  '교육 · 인재개발',
  '조직문화',
  '근태 · 휴가',
  '입퇴사 관리',
  '퇴직 · 퇴직연금',
  '기타',
]

// 이름 대신 역할로 적은 가상 담당자 (사람 선택과 담당자 추가는 기능 3)
export const MEMBERS = ['채용 담당자 A', '급여 담당자 B', '복리후생 담당자 C']

export const START_HOURS = Array.from({ length: 14 }, (_, i) => 8 + i) // 8시~21시
export const END_HOURS = Array.from({ length: 14 }, (_, i) => 9 + i) // 9시~22시

export interface Task {
  id: number
  title: string
  category: string
  owner: string
  status: Status
  start: DateStr // 시작일
  end: DateStr // 종료일 (시작일과 같거나 뒤)
  important: boolean
  startHour?: number
  endHour?: number
  lastChanged: DateStr
  lastEditor: string // 마지막 수정자 (팀장이 고쳤으면 「팀장」)
}

type Seed = Omit<Task, 'id' | 'start' | 'end' | 'lastChanged' | 'lastEditor'> & {
  dueOffset: number // 종료일: 오늘 기준 달력 날짜
  spanDays?: number // 시작일은 종료일보다 며칠 앞인지 (없으면 하루짜리)
  idleDays: number // 마지막 변경이 며칠(영업일) 전인지
}

const SEEDS: Seed[] = [
  // 채용 담당자 A
  { title: '상반기 신입 공고 문안 검토', category: '채용', owner: MEMBERS[0], status: '진행 중', dueOffset: -2, spanDays: 4, idleDays: 3, important: true },
  { title: '면접 일정 조율 안내', category: '채용', owner: MEMBERS[0], status: '진행 중', dueOffset: 2, idleDays: 0, important: true, startHour: 10, endHour: 12 },
  { title: '합격자 서류 수합', category: '입퇴사 관리', owner: MEMBERS[0], status: '멈춤', dueOffset: 5, idleDays: 4, important: false },
  { title: '채용 사이트 공고 내림', category: '채용', owner: MEMBERS[0], status: '완료', dueOffset: -4, idleDays: 2, important: false },
  { title: '입사 환영 자료 정리', category: '조직문화', owner: MEMBERS[0], status: '진행 중', dueOffset: 7, idleDays: 1, important: false },
  { title: '레퍼런스 체크 양식 개선', category: '채용', owner: MEMBERS[0], status: '진행 중', dueOffset: 10, idleDays: 2, important: false },
  { title: '수습 평가 일정 공지', category: '평가 · 보상', owner: MEMBERS[0], status: '진행 중', dueOffset: 3, idleDays: 0, important: true, startHour: 14, endHour: 15 },
  // 급여 담당자 B
  { title: '이번 달 급여 정산 확인', category: '급여 및 4대보험', owner: MEMBERS[1], status: '진행 중', dueOffset: 4, spanDays: 2, idleDays: 1, important: true, startHour: 9, endHour: 13 },
  { title: '4대보험 취득 · 상실 신고', category: '급여 및 4대보험', owner: MEMBERS[1], status: '진행 중', dueOffset: -1, idleDays: 2, important: true },
  { title: '연말정산 안내문 초안', category: '급여 및 4대보험', owner: MEMBERS[1], status: '멈춤', dueOffset: 14, spanDays: 5, idleDays: 5, important: false },
  { title: '퇴직금 중간정산 문의 답변', category: '퇴직 · 퇴직연금', owner: MEMBERS[1], status: '완료', dueOffset: -3, idleDays: 1, important: false },
  { title: '급여 명세서 양식 점검', category: '급여 및 4대보험', owner: MEMBERS[1], status: '진행 중', dueOffset: 6, idleDays: 0, important: false },
  { title: '근태 마감 자료 받기', category: '근태 · 휴가', owner: MEMBERS[1], status: '진행 중', dueOffset: 1, idleDays: 3, important: false },
  { title: '초과근무 현황 정리', category: '노무', owner: MEMBERS[1], status: '진행 중', dueOffset: 8, idleDays: 1, important: false },
  // 복리후생 담당자 C
  { title: '건강검진 대상자 안내', category: '복리후생', owner: MEMBERS[2], status: '진행 중', dueOffset: 3, spanDays: 1, idleDays: 1, important: true, startHour: 11, endHour: 12 },
  { title: '복지 포인트 소진 현황 확인', category: '복리후생', owner: MEMBERS[2], status: '진행 중', dueOffset: -5, idleDays: 2, important: false },
  { title: '사내 동호회 지원금 정산', category: '복리후생', owner: MEMBERS[2], status: '멈춤', dueOffset: 9, idleDays: 6, important: false },
  { title: '연차 사용 촉진 문안 작성', category: '근태 · 휴가', owner: MEMBERS[2], status: '진행 중', dueOffset: 12, idleDays: 0, important: true },
  { title: '교육 과정 신청 취합', category: '교육 · 인재개발', owner: MEMBERS[2], status: '완료', dueOffset: -2, idleDays: 0, important: false },
  { title: '인사 규정 개정안 검토 자료', category: '인사기획', owner: MEMBERS[2], status: '진행 중', dueOffset: 15, idleDays: 2, important: false },
]

export function makeSeedTasks(today: DateStr, holidays: Set<DateStr>): Task[] {
  return SEEDS.map(({ dueOffset, spanDays = 0, idleDays, ...rest }, i) => {
    const end = addDays(today, dueOffset)
    return {
      ...rest,
      id: i + 1,
      start: addDays(end, -spanDays),
      end,
      lastChanged: businessDaysAgo(today, idleDays, holidays),
      lastEditor: rest.owner,
    }
  })
}
