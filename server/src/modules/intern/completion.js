/** Ten equally weighted profile requirements; each worth 10%. */
export const REQUIRED = [
  ['photo_path', 'Profile photo'], ['institution', 'Institution attended'], ['course', 'Course studied'],
  ['qualification_level', 'Qualification level'], ['graduation_year', 'Graduation year'],
  ['skills', 'Skills'], ['career_interests', 'Career interests'], ['preferred_county', 'Preferred location'],
  ['preferred_work_arrangement', 'Work arrangement'], ['cv_path', 'CV (PDF)'],
];

const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && String(v).trim() !== '');

export function completion(profile) {
  const missing = REQUIRED.filter(([k]) => !filled(profile[k])).map(([, label]) => label);
  return { pct: Math.round(((REQUIRED.length - missing.length) / REQUIRED.length) * 100), missing };
}
