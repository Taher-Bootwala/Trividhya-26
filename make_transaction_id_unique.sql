-- This SQL script adds a UNIQUE constraint to the transaction_id column 
-- in the registrations table to prevent the same transaction ID from being reused.

-- Note: In PostgreSQL, a UNIQUE constraint allows multiple NULL values, 
-- so cash payments (where transaction_id is NULL) will not be affected.

ALTER TABLE public.registrations 
ADD CONSTRAINT unique_transaction_id UNIQUE (transaction_id);
