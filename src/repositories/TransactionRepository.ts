import { db } from '../db';
import { Insertable, Transaction } from 'kysely';
import { TransactionTable, Database } from '../db/types';

export class TransactionRepository {
    async create(transaction: Insertable<TransactionTable>, trx?: Transaction<Database>) {
        const executor = trx || db;
        return await executor
            .insertInto('transactions')
            .values(transaction)
            .returningAll()
            .executeTakeFirstOrThrow();
    }

    async addToBalance(userId: string, amount: number, trx?: Transaction<Database>) {
        const executor = trx || db;
        return await executor
            .updateTable('users')
            .set((eb) => ({
                balance: eb('balance', '+', amount),
            }))
            .where('id', '=', userId)
            .returning(['balance'])
            .executeTakeFirstOrThrow();
    }
}
