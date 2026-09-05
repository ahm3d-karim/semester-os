-- Semester OS migration 002: section choice on courses (LUMS catalog picker)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS section_code text;
