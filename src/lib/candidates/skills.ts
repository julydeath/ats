// Skill normalization shared by resume parsing, the Candidates collection and
// candidate search. Skills are stored as display labels ("Node.js") and a
// pipe-delimited lowercase copy (`skillsSearch`) so "has ALL of these skills"
// filters can run as plain column `contains` checks in the database.

const MAX_SKILLS = 40
const MAX_SKILL_LENGTH = 60

const SKILL_ALIASES: Record<string, string> = {
  '.net': '.NET',
  '.net core': '.NET Core',
  'amazon web services': 'AWS',
  angularjs: 'AngularJS',
  'asp.net': 'ASP.NET',
  aws: 'AWS',
  azure: 'Azure',
  'c#': 'C#',
  'c++': 'C++',
  'ci/cd': 'CI/CD',
  css3: 'CSS',
  dotnet: '.NET',
  'express.js': 'Express',
  expressjs: 'Express',
  gcp: 'GCP',
  golang: 'Go',
  'google cloud': 'GCP',
  html5: 'HTML',
  js: 'JavaScript',
  k8s: 'Kubernetes',
  'ms excel': 'Excel',
  'ms sql': 'SQL Server',
  mssql: 'SQL Server',
  mongo: 'MongoDB',
  'nest.js': 'NestJS',
  nestjs: 'NestJS',
  nextjs: 'Next.js',
  'next js': 'Next.js',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node js': 'Node.js',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  'power bi': 'Power BI',
  powerbi: 'Power BI',
  'react.js': 'React',
  reactjs: 'React',
  'react js': 'React',
  'react native': 'React Native',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  restful: 'REST APIs',
  'restful apis': 'REST APIs',
  'spring boot': 'Spring Boot',
  springboot: 'Spring Boot',
  'sql server': 'SQL Server',
  ts: 'TypeScript',
  'vue.js': 'Vue',
  vuejs: 'Vue',
}

const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim()

export const normalizeSkill = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const cleaned = collapse(value.replace(/^[\s•\-*·|,;:]+|[\s•\-*·|,;:.]+$/g, ''))

  if (!cleaned || cleaned.length > MAX_SKILL_LENGTH) {
    return null
  }

  return SKILL_ALIASES[cleaned.toLowerCase()] || cleaned
}

export const normalizeSkillList = (values: unknown): string[] => {
  const rawValues = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(/[,;|\n]/)
      : []

  const seen = new Set<string>()
  const skills: string[] = []

  for (const rawValue of rawValues) {
    const skill = normalizeSkill(rawValue)

    if (!skill) continue

    const key = skill.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    skills.push(skill)

    if (skills.length >= MAX_SKILLS) break
  }

  return skills
}

export const buildSkillsSearch = (...lists: unknown[]): string | null => {
  const keys = Array.from(
    new Set(lists.flatMap((list) => normalizeSkillList(list)).map((skill) => skill.toLowerCase())),
  )

  return keys.length > 0 ? `|${keys.join('|')}|` : null
}

// Turns "react, node js, AWS" into the lowercase canonical keys stored in
// `skillsSearch`, so recruiters can type aliases and still match.
export const parseSkillQuery = (value: string): string[] =>
  normalizeSkillList(value).map((skill) => skill.toLowerCase())
