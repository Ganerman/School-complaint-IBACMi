insert into public.complaint_categories(name,description) values
('Electrical','Lights, outlets, wiring, or electrical safety'),
('Plumbing','Leaks, drains, toilets, and water supply'),
('Furniture','Desks, chairs, cabinets, and fixtures'),
('Air Conditioning','Cooling and ventilation concerns'),
('ICT Equipment','School-owned computers, projectors, and network equipment'),
('Structural','Walls, ceilings, windows, doors, and flooring'),
('Cleanliness','Waste, sanitation, and cleaning needs'),
('Safety and Security','Hazards, locks, alarms, and access concerns')
on conflict(name) do nothing;

insert into public.locations(building,floor,room,location_description) values
('Main Building','Ground Floor','Lobby','Main entrance and reception'),
('Main Building','First Floor','Room 101','General classroom'),
('Main Building','Second Floor','Room 201','General classroom'),
('Science Building','Ground Floor','Laboratory 1','Chemistry laboratory'),
('Science Building','First Floor','Laboratory 2','Physics laboratory'),
('Library','Ground Floor',null,'Reading and circulation area'),
('Gymnasium','Ground Floor',null,'Indoor court and bleachers'),
('Administration Building','Ground Floor','Registrar','Registrar office')
on conflict(building,floor,room) do nothing;

insert into public.system_settings(setting_key,setting_value,description) values
('school_name','"Your School Name"','Displayed school name'),
('reopen_window_days','7','Days after resolution that a student may request reopening'),
('notification_email_enabled','false','Whether deployed email Edge Function is enabled')
on conflict(setting_key) do nothing;

-- Development users must first be created through Supabase Auth; do not put passwords in SQL.
-- After creating them, promote accounts using their verified email:
-- update public.profiles set role='admin' where email='admin@your-school.edu';
-- update public.profiles set role='maintenance', specialization='Electrical'
-- where email='maintenance@your-school.edu';
-- A newly registered public account remains a student automatically.
--
-- Sample complaints/notifications intentionally are not inserted until valid Auth user UUIDs exist.
-- See README "Seed development users and records" for safe parameterized examples.
