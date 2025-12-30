import { db } from '../db';
import { UserRepository } from '../repositories/UserRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import {
    ConflictError,
    InsufficientFundsError,
    InvalidTransactionError,
    UserNotFoundError
} from '../errors/AppErrors';

export class LedgerService {
    private userRepo = new UserRepository();
    private transactionRepo = new TransactionRepository();

    async createUser(data: { full_name: string; email: string; cpf: string }) {
        const existing = await this.userRepo.findByEmailOrCpf(data.email, data.cpf);
        if (existing) throw new ConflictError('User already exists');
        return await this.userRepo.create({ ...data, balance: 0 });
    }

    async deposit(data: { payee_id: string; amount: number }) {
        if (data.amount <= 0) throw new InvalidTransactionError('Amount must be positive');

        return await db.transaction().execute(async (trx) => {
            const user = await this.userRepo.findById(data.payee_id, trx);
            if (!user) throw new UserNotFoundError('User not found');

            await this.transactionRepo.create(
                {
                    payer_id: data.payee_id,
                    payee_id: data.payee_id,
                    amount: data.amount,
                    type: 'DEPOSIT',
                },
                trx
            );

            return await this.transactionRepo.addToBalance(data.payee_id, data.amount, trx);
        });
    }

    async getBalance(userId: string) {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new UserNotFoundError('User not found');
        return { balance: user.balance };
    }

    async transfer(data: { payer_id: string; payee_id: string; amount: number }) {
        if (data.amount <= 0) throw new InvalidTransactionError('Amount must be positive');
        if (data.payer_id === data.payee_id) throw new InvalidTransactionError('Cannot transfer to self');

        return await db.transaction().execute(async (trx) => {
            const firstLockId = data.payer_id < data.payee_id ? data.payer_id : data.payee_id;
            const secondLockId = data.payer_id < data.payee_id ? data.payee_id : data.payer_id;

            const user1 = await this.userRepo.findByIdForUpdate(firstLockId, trx);
            const user2 = await this.userRepo.findByIdForUpdate(secondLockId, trx);

            if (!user1 || !user2) throw new UserNotFoundError('One or more users not found');

            const payer = data.payer_id === user1.id ? user1 : user2;
            const payee = data.payee_id === user1.id ? user1 : user2;

            if (payer.balance < data.amount) {
                throw new InsufficientFundsError();
            }

            await this.userRepo.decrementBalance(payer.id, data.amount, trx);
            await this.userRepo.incrementBalance(payee.id, data.amount, trx);

            const newPayerBalance = payer.balance - data.amount;

            const transaction = await this.transactionRepo.create(
                {
                    payer_id: payer.id,
                    payee_id: payee.id,
                    amount: data.amount,
                    type: 'TRANSFER',
                },
                trx
            );

            return {
                transaction_id: transaction.id,
                payer_balance: newPayerBalance,
            };
        });
    }
}
