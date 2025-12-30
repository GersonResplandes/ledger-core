// scripts/stress-test.ts
import fetch from 'node-fetch'; // Se der erro, usaremos o fetch nativo do Node 18+

const BASE_URL = 'http://localhost:3000';

async function run() {
    console.log('🔥 INICIANDO TESTE DE ESTRESSE DE CONCORRÊNCIA 🔥\n');

    // 1. Criar Usuário A (Vítima)
    const userA = await (await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: 'User A', email: `a_${Date.now()}@test.com`, cpf: `${Date.now()}`.slice(0, 11) })
    })).json() as any;

    // 2. Criar Usuário B (Recebedor)
    const userB = await (await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: 'User B', email: `b_${Date.now()}@test.com`, cpf: `${Date.now()}`.slice(0, 11) })
    })).json() as any;

    console.log(`✅ Usuários criados. ID A: ${userA.id}`);

    // 3. Depositar R$ 100,00 (10000 centavos) na conta A
    await fetch(`${BASE_URL}/transactions/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payee_id: userA.id, amount: 10000 })
    });

    console.log('✅ Depósito de R$ 100,00 realizado.\n');
    console.log('🚀 DISPARANDO 5 TRANSFERÊNCIAS DE R$ 30,00 SIMULTANEAMENTE...');

    // 4. O ATAQUE: 5 Requests ao mesmo tempo (Promise.all)
    // Total necessário: 150.00. Disponível: 100.00.
    const requests = Array.from({ length: 5 }).map((_, i) => {
        return fetch(`${BASE_URL}/transactions/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payer_id: userA.id,
                payee_id: userB.id,
                amount: 3000 // R$ 30,00
            })
        }).then(async res => ({
            status: res.status,
            body: await res.json()
        }));
    });

    const results = await Promise.all(requests);

    // 5. Análise dos Resultados
    const successes = results.filter(r => r.status === 200).length;
    const failures = results.filter(r => r.status === 400).length;

    console.log('\n--- RESULTADO ---');
    console.log(`Sucessos (200 OK): ${successes}`);
    console.log(`Falhas (400 Bad Request): ${failures}`);

    // 6. Conferência Final
    const finalBalanceA = await (await fetch(`${BASE_URL}/users/${userA.id}/balance`)).json() as any;

    console.log(`Saldo Final Usuário A: R$ ${finalBalanceA.balance / 100}`);

    if (successes === 3 && failures === 2 && finalBalanceA.balance === 1000) {
        console.log('\n🏆 SUCESSO! O SISTEMA É ACID E THREAD-SAFE. 🏆');
    } else {
        console.log('\n❌ FALHA! Ocorreu Race Condition.');
    }
}

run();