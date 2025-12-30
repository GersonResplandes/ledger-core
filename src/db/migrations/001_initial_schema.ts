import { Kysely, sql } from 'kysely';
import { Database } from '../types';

export async function up(db: Kysely<Database>): Promise<void> {
    // --- Tabela USERS ---
    await db.schema
        .createTable('users')
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('full_name', 'varchar', (col) => col.notNull())
        .addColumn('email', 'varchar', (col) => col.notNull().unique())
        .addColumn('cpf', 'varchar', (col) => col.notNull().unique())
        .addColumn('balance', 'integer', (col) => col.notNull().defaultTo(0)) // Centavos!
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
        .execute();

    // --- Tabela TRANSACTIONS ---
    await db.schema
        .createTable('transactions')
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
        .addColumn('payer_id', 'uuid', (col) => col.references('users.id').notNull())
        .addColumn('payee_id', 'uuid', (col) => col.references('users.id').notNull())
        .addColumn('amount', 'integer', (col) => col.notNull())
        .addColumn('type', 'varchar', (col) => col.notNull()) // 'DEPOSIT' | 'TRANSFER'
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
        .execute();

    // Índice para performance de queries históricas
    await db.schema
        .createIndex('idx_transactions_payer')
        .on('transactions')
        .column('payer_id')
        .execute();

    await db.schema
        .createIndex('idx_transactions_payee')
        .on('transactions')
        .column('payee_id')
        .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
    await db.schema.dropTable('transactions').execute();
    await db.schema.dropTable('users').execute();
}
