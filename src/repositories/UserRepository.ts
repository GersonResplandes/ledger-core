import { db } from '../db';
import { Insertable, Transaction } from 'kysely';
import { UserTable, Database } from '../db/types';

export class UserRepository {
    // Permite passar uma transação opcional (trx) ou usa o banco global (db)
    async create(user: Insertable<UserTable>, trx?: Transaction<Database>) {
        const executor = trx || db;
        return await executor
            .insertInto('users')
            .values(user)
            .returningAll()
            .executeTakeFirstOrThrow();
    }

    async findById(id: string, trx?: Transaction<Database>) {
        const executor = trx || db;
        return await executor
            .selectFrom('users')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();
    }

    // 🔥 O MÉTODO QUE ESTAVA FALTANDO 🔥
    async findByIdForUpdate(id: string, trx: Transaction<Database>) {
        return await trx
            .selectFrom('users')
            .selectAll()
            .where('id', '=', id)
            .forUpdate() // <--- TRAVA A LINHA NO POSTGRES
            .executeTakeFirst();
    }

    async findByEmailOrCpf(email: string, cpf: string) {
        return await db
            .selectFrom('users')
            .selectAll()
            .where((eb) => eb.or([eb('email', '=', email), eb('cpf', '=', cpf)]))
            .executeTakeFirst();
    }

    // Atualiza saldo dentro da transação
    // 📉 Decremento Atômico (Mais seguro que setar valor absoluto)
    async decrementBalance(id: string, amount: number, trx: Transaction<Database>) {
        return await trx
            .updateTable('users')
            .set((eb) => ({
                balance: eb('balance', '-', amount), // balance = balance - amount (SQL)
            }))
            .where('id', '=', id)
            .execute();
    }

    // 📈 Incremento Atômico
    async incrementBalance(id: string, amount: number, trx: Transaction<Database>) {
        return await trx
            .updateTable('users')
            .set((eb) => ({
                balance: eb('balance', '+', amount), // balance = balance + amount (SQL)
            }))
            .where('id', '=', id)
            .execute();
    }
}
