-- ============================================================
-- Add domain and company_type columns to companies.
-- Run in Supabase Studio → SQL Editor. Idempotent.
-- ============================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS company_type text;

-- Map known companies from the CSV.
-- All companies in CSV are "Product" type.
-- domain = the "Type" column from CSV (AI, SaaS, MarTech, DevTools, etc.)

UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'grammarly';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'people.ai';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'reface';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'preply';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'macpaw';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'jooble';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'genesis';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'betterme';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'liki24';
UPDATE companies SET domain = 'MarTech', company_type = 'Product' WHERE lower(name) = 'reply.io';
UPDATE companies SET domain = 'MarTech', company_type = 'Product' WHERE lower(name) = 'netpeak group';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'competera';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'youscan';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'ajax systems';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'restream';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'airslate';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'pandadoc';
UPDATE companies SET domain = 'DevTools', company_type = 'Product' WHERE lower(name) = 'railsware';
UPDATE companies SET domain = 'DevTools', company_type = 'Product' WHERE lower(name) = 'gitlab';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'creatio';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'headway';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'skylum';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'readdle';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'mobalytics';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'dmarket';
UPDATE companies SET domain = 'DevTools', company_type = 'Product' WHERE lower(name) = 'mailtrap';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'uspacy';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'elai.io';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'respeecher';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'peopleforce';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'petcube';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'solidgate';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'fintech farm';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'roosh';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'holywater';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'obrio';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'welltech';
UPDATE companies SET domain = 'FinTech', company_type = 'Product' WHERE lower(name) = 'monobank';
UPDATE companies SET domain = 'FinTech', company_type = 'Product' WHERE lower(name) = 'portmone';
UPDATE companies SET domain = 'FinTech', company_type = 'Product' WHERE lower(name) = 'novapay';
UPDATE companies SET domain = 'Marketplace', company_type = 'Product' WHERE lower(name) = 'rozetka';
UPDATE companies SET domain = 'Marketplace', company_type = 'Product' WHERE lower(name) = 'uklon';
UPDATE companies SET domain = 'Crypto/Web3', company_type = 'Product' WHERE lower(name) = 'whitebit';
UPDATE companies SET domain = 'GameDev', company_type = 'Product' WHERE lower(name) = 'plarium';
UPDATE companies SET domain = 'GameDev', company_type = 'Product' WHERE lower(name) = 'gsc game world';
UPDATE companies SET domain = 'GameDev', company_type = 'Product' WHERE lower(name) = 'room 8 studio';
UPDATE companies SET domain = 'GameDev', company_type = 'Product' WHERE lower(name) = 'room8studio';
UPDATE companies SET domain = 'MediaTech', company_type = 'Product' WHERE lower(name) = 'megogo';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'promova';
UPDATE companies SET domain = 'Security', company_type = 'Product' WHERE lower(name) = 'hacken';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'boosters';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'appflame';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'plantin';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'spendbase';
UPDATE companies SET domain = 'EdTech', company_type = 'Product' WHERE lower(name) = 'mate academy';
UPDATE companies SET domain = 'EdTech', company_type = 'Product' WHERE lower(name) = 'goit';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'djinni';
UPDATE companies SET domain = 'Marketplace', company_type = 'Product' WHERE lower(name) = 'work.ua';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'shelf';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'botscrew';
UPDATE companies SET domain = 'DevTools', company_type = 'Product' WHERE lower(name) = 'intellias';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'leeloo.ai';
UPDATE companies SET domain = 'MarTech', company_type = 'Product' WHERE lower(name) = 'mgid';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'fondy';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'tranzzo';
UPDATE companies SET domain = 'PropTech', company_type = 'Product' WHERE lower(name) = 'lun';
UPDATE companies SET domain = 'Logistics', company_type = 'Product' WHERE lower(name) = 'nova poshta';
UPDATE companies SET domain = 'GovTech', company_type = 'Product' WHERE lower(name) = 'prozorro';
UPDATE companies SET domain = 'GovTech', company_type = 'Product' WHERE lower(name) = 'diia';
UPDATE companies SET domain = 'LegalTech', company_type = 'Product' WHERE lower(name) = 'axdraft';
UPDATE companies SET domain = 'SpaceTech', company_type = 'Product' WHERE lower(name) = 'firefly aerospace';
UPDATE companies SET domain = 'InsurTech', company_type = 'Product' WHERE lower(name) = 'arx';
UPDATE companies SET domain = 'Crypto/Web3', company_type = 'Product' WHERE lower(name) = 'everstake';
UPDATE companies SET domain = 'Crypto/Web3', company_type = 'Product' WHERE lower(name) = 'matter labs';
UPDATE companies SET domain = 'Crypto/Web3', company_type = 'Product' WHERE lower(name) = 'cex.io';
UPDATE companies SET domain = 'Crypto/Web3', company_type = 'Product' WHERE lower(name) = '1inch';
UPDATE companies SET domain = 'SaaS', company_type = 'Product' WHERE lower(name) = 'evo.company';
UPDATE companies SET domain = 'HealthTech', company_type = 'Product' WHERE lower(name) = 'helsi';
UPDATE companies SET domain = 'DefenseTech', company_type = 'Product' WHERE lower(name) = 'himera';
UPDATE companies SET domain = 'DefenseTech', company_type = 'Product' WHERE lower(name) = 'kvertus';
UPDATE companies SET domain = 'AI', company_type = 'Product' WHERE lower(name) = 'osavul';
UPDATE companies SET domain = 'Robotics', company_type = 'Product' WHERE lower(name) = 'deus robotics';
UPDATE companies SET domain = 'AgriTech', company_type = 'Product' WHERE lower(name) = 'eos data analytics';

-- Verify
SELECT domain, company_type, COUNT(*) AS cnt
FROM companies
WHERE domain IS NOT NULL
GROUP BY domain, company_type
ORDER BY cnt DESC;
