import { describe, expect, it } from 'vitest'

import {
  buildSkillsSearch,
  normalizeSkillList,
  parseSkillQuery,
} from '@/lib/candidates/skills'

describe('Candidate skills', () => {
  it('normalizes aliases and removes duplicates case-insensitively', () => {
    expect(normalizeSkillList(['ReactJS', 'react.js', 'NodeJS', ' AWS ', 'Spring Boot', 'aws'])).toEqual([
      'React',
      'Node.js',
      'AWS',
      'Spring Boot',
    ])
  })

  it('splits free-text skill lists', () => {
    expect(normalizeSkillList('Java, springboot; Kafka | k8s')).toEqual([
      'Java',
      'Spring Boot',
      'Kafka',
      'Kubernetes',
    ])
  })

  it('builds a pipe-delimited search key across skill lists', () => {
    expect(buildSkillsSearch(['React', 'Node.js'], ['react', 'TypeScript'])).toBe(
      '|react|node.js|typescript|',
    )
    expect(buildSkillsSearch([], null)).toBeNull()
  })

  it('maps recruiter queries onto stored keys so exact tag matching works', () => {
    const search = buildSkillsSearch(['Java', 'JavaScript', 'Spring Boot'])!

    expect(parseSkillQuery('java, spring boot')).toEqual(['java', 'spring boot'])
    expect(parseSkillQuery('java').every((skill) => search.includes(`|${skill}|`))).toBe(true)
    // "java" must not match a JavaScript-only candidate.
    expect(buildSkillsSearch(['JavaScript'])!.includes('|java|')).toBe(false)
  })
})
