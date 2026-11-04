-- Migration: Add Graphic Card (GPU) field to the systems table
ALTER TABLE systems ADD COLUMN gpu VARCHAR(100) AFTER cpu;

-- Migration: Add Status field to the employees table to support paused/suspended accounts
ALTER TABLE employees ADD COLUMN status VARCHAR(20) DEFAULT 'Active';

-- Migration: Add Biometric / Card ID to employees
ALTER TABLE employees ADD COLUMN biometric_id VARCHAR(50) DEFAULT NULL;

-- Migration: Add Punch Source to attendance_records
ALTER TABLE attendance_records ADD COLUMN punchSource VARCHAR(30) DEFAULT 'WEB';

-- Migration: Align collation between attendance tables and employees
ALTER TABLE attendance_records CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE attendance_breaks CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
