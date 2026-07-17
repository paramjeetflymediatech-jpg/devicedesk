-- Migration: Add Graphic Card (GPU) field to the systems table
ALTER TABLE systems ADD COLUMN gpu VARCHAR(100) AFTER cpu;

-- Migration: Add Status field to the employees table to support paused/suspended accounts
ALTER TABLE employees ADD COLUMN status VARCHAR(20) DEFAULT 'Active';
