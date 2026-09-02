-- Semester OS -- Seed Data for Supabase
-- Run after 001_initial.sql: psql -f seed.sql
-- Seeds LUMS institution, Fall 2026 sessions, and calendar events

-- Institution
INSERT INTO institutions (id, code, name, calendar_url)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'LUMS',
  'Lahore University of Management Sciences',
  'https://lums.edu.pk/academic-calendar'
)
ON CONFLICT (code) DO NOTHING;

-- Sessions: Fall 2026, 16 weeks starting 2026-09-01
-- Each session is a Mon-Sun week
INSERT INTO sessions (id, inst_id, term, session_no, date_start, date_end)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 1,  '2026-09-01', '2026-09-07'),
  ('10000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 2,  '2026-09-08', '2026-09-14'),
  ('10000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 3,  '2026-09-15', '2026-09-21'),
  ('10000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 4,  '2026-09-22', '2026-09-28'),
  ('10000000-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 5,  '2026-09-29', '2026-10-05'),
  ('10000000-0000-0000-0000-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 6,  '2026-10-06', '2026-10-12'),
  ('10000000-0000-0000-0000-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 7,  '2026-10-13', '2026-10-19'),
  ('10000000-0000-0000-0000-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 8,  '2026-10-20', '2026-10-26'),
  ('10000000-0000-0000-0000-000000000009', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 9,  '2026-10-27', '2026-11-02'),
  ('10000000-0000-0000-0000-000000000010', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 10, '2026-11-03', '2026-11-09'),
  ('10000000-0000-0000-0000-000000000011', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 11, '2026-11-10', '2026-11-16'),
  ('10000000-0000-0000-0000-000000000012', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 12, '2026-11-17', '2026-11-23'),
  ('10000000-0000-0000-0000-000000000013', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 13, '2026-11-24', '2026-11-30'),
  ('10000000-0000-0000-0000-000000000014', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 14, '2026-12-01', '2026-12-07'),
  ('10000000-0000-0000-0000-000000000015', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 15, '2026-12-08', '2026-12-14'),
  ('10000000-0000-0000-0000-000000000016', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 16, '2026-12-15', '2026-12-21')
ON CONFLICT (inst_id, term, session_no) DO NOTHING;

-- Calendar events
INSERT INTO calendar_events (id, inst_id, term, title, date_start, date_end, official)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 'Add/Drop Deadline', '2026-09-08', '2026-09-08', true),
  ('20000000-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 'Midterm Exams Week', '2026-10-20', '2026-10-26', true),
  ('20000000-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 'Q-Drop Deadline', '2026-11-03', '2026-11-03', true),
  ('20000000-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 'Final Exams Period', '2026-12-08', '2026-12-21', true),
  ('20000000-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Fall 2026', 'Grades Due', '2026-12-22', '2026-12-22', true)
ON CONFLICT DO NOTHING;
