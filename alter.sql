-- Migration: Add Graphic Card (GPU) field to the systems table
ALTER TABLE systems ADD COLUMN gpu VARCHAR(100) AFTER cpu;
