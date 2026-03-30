-- Migration 006: Additional social links on drills
alter table drills
  add column if not exists tiktok_url text,
  add column if not exists facebook_url text;
