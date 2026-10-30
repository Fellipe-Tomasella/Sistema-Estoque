-- Executado só na primeira subida do volume de desenvolvimento.
CREATE DATABASE estoque_test;

\connect estoque
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

\connect estoque_test
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
