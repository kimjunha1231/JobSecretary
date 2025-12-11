// Status labels
export const STATUS_LABELS: Record<string, string> = {
  writing: '작성 중',
  applied: '지원 완료',
  interview: '면접',
  pass: '합격',
  fail: '불합격',
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  writing: 'bg-yellow-500/20 text-yellow-400',
  applied: 'bg-blue-500/20 text-blue-400',
  interview: 'bg-purple-500/20 text-purple-400',
  pass: 'bg-green-500/20 text-green-400',
  fail: 'bg-red-500/20 text-red-400',
};

// Common tags
export const COMMON_TAGS = [
  '지원동기',
  '성격의 장단점',
  '입사 후 포부',
  '직무관련 경험',
  '협업 경험',
  '문제해결',
  '성장하고 싶은 개발자',
];

// API endpoints
export const API_ENDPOINTS = {
  documents: '/api/documents',
  archive: '/api/documents/archive',
  userProfile: '/api/user-profile',
  deleteAccount: '/api/account/delete',
} as const;

