ALTER TABLE onboarding_tasks ADD COLUMN sort_order INT NOT NULL DEFAULT 0;
UPDATE onboarding_tasks SET sort_order = CASE title WHEN 'Organization profile' THEN 0 WHEN 'Security documentation' THEN 1 WHEN 'Technical configuration' THEN 2 WHEN 'Team access' THEN 3 WHEN 'Go-live readiness' THEN 4 ELSE 5 END;
