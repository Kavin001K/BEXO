/**
 * Must stay in sync with api-server/src/lib/profileCompleteness.ts
 */
export const COMPLETENESS_PASS_SCORE = 90;

export const COMPLETENESS_WEIGHTS = {
  full_name: 15,
  headline: 15,
  bio: 10,
  avatar_url: 10,
  location: 5,
  handle: 10,
  education: 15,
  experience: 15,
  projects: 10,
  skills: 5,
} as const;
