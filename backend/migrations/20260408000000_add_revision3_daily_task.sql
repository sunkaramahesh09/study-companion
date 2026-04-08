-- Add revision_3 and daily_task to the task_type enum
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'revision_3';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'daily_task';
