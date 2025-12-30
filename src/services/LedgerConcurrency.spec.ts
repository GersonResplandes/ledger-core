import { LedgerService } from './LedgerService';
import { db } from '../db';
import { sql } from 'kysely';

describe('Ledger (Integrity & Concurrency)', () => {
    let service: LedgerService;

    // IDs fixos para os testes
    let userAId: string;
    let userBId: string;

    beforeAll(async () => {
        service = new LedgerService();
        // Limpa tabelas antes de começar
        await sql`TRUNCATE TABLE transactions, users RESTART IDENTITY CASCADE`.execute(db);
    });

    afterAll(async () => {
        await db.destroy();
    });

    beforeEach(async () => {
        // Reseta o estado para cada teste
        await sql`TRUNCATE TABLE transactions, users RESTART IDENTITY CASCADE`.execute(db);

        // Cria dois usuários base
        const userA = await service.createUser({
            full_name: 'Alice Concurrency',
            email: 'alice@test.com',
            cpf: '111.111.111-11',
        });
        const userB = await service.createUser({
            full_name: 'Bob Concurrency',
            email: 'bob@test.com',
            cpf: '222.222.222-22',
        });

        userAId = userA.id;
        userBId = userB.id;

        // Deposita saldo inicial em A
        await service.deposit({ payee_id: userAId, amount: 1000 }); // R$ 10,00
    });

    it('deve garantir saldo correto após múltiplas transferências PARALELAS', async () => {
        // CENÁRIO: Alice tem 1000. Ela faz 5 transferências de 100 para Bob AO MESMO TEMPO.
        // Se houver Race Condition, o saldo pode ficar errado.
        // Se houver Deadlock, o teste vai travar (timeout).

        const transfers = Array(5)
            .fill(null)
            .map(() =>
                service.transfer({
                    payer_id: userAId,
                    payee_id: userBId,
                    amount: 100,
                })
            );

        // Dispara o canhão!
        await Promise.all(transfers);

        // VALIDAÇÃO
        const balanceA = await service.getBalance(userAId);
        const balanceB = await service.getBalance(userBId);

        // 1000 - (5 * 100) = 500
        expect(balanceA.balance).toBe(500);
        // 0 + (5 * 100) = 500
        expect(balanceB.balance).toBe(500);
    }, 15000); // Timeout maior para aguentar o tranco

    it('deve prevenir saldo negativo em Race Condition (Double Spending)', async () => {
        // CENÁRIO: Alice tem 100. Ela tenta fazer 2 transferências de 100 simultâneas.
        // Apenas UMA deve passar. A outra deve falhar com "Insufficient funds".

        // Reseta saldo para 100
        await sql`UPDATE users SET balance = 100 WHERE id = ${userAId}`.execute(db);

        const t1 = service.transfer({ payer_id: userAId, payee_id: userBId, amount: 100 });
        const t2 = service.transfer({ payer_id: userAId, payee_id: userBId, amount: 100 });

        const results = await Promise.allSettled([t1, t2]);

        // Conta quantos sucessos e quantas falhas
        const successes = results.filter((r) => r.status === 'fulfilled').length;
        const failures = results.filter((r) => r.status === 'rejected').length;

        expect(successes).toBe(1);
        expect(failures).toBe(1);

        // Verifica saldo final (deve ser 0, não -100)
        const balanceA = await service.getBalance(userAId);
        expect(balanceA.balance).toBe(0);
    });

    it('deve prevenir DEADLOCKS quando A->B e B->A transferem simultaneamente', async () => {
        // CENÁRIO DO ABRAÇO DA MORTE:
        // Thread 1: Lock A ... tenta Lock B
        // Thread 2: Lock B ... tenta Lock A
        // Se a gente não ordenasse os locks por ID, isso travaria o banco.

        // Dá saldo para o Bob também
        await service.deposit({ payee_id: userBId, amount: 1000 });

        const toBob = service.transfer({ payer_id: userAId, payee_id: userBId, amount: 100 });
        const toAlice = service.transfer({ payer_id: userBId, payee_id: userAId, amount: 100 });

        // Se o código tiver bug de deadlock, isso aqui nunca retorna (timeout)
        await Promise.all([toBob, toAlice]);

        // Se chegou aqui, passou no teste de deadlock!
        expect(true).toBe(true);
    });
});
