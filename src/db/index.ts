import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { Database } from './types';

dotenv.config();

// Configuração do Driver Nativo (pg)
const dialect = new PostgresDialect({
    pool: new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10, // Pool de conexões (importante para performance)
    }),
});

// Instância do Banco Tipada
export const db = new Kysely<Database>({
    dialect,
    // Log de queries em dev para vermos o SQL gerado (educativo!)
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});
