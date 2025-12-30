import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { LedgerService } from './services/LedgerService';

const app = fastify();

// Setup Zod no Fastify
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

const ledgerService = new LedgerService();

// Typed App (para autocomplete do Zod nas rotas)
const server = app.withTypeProvider<ZodTypeProvider>();

// --- ROTAS ---

// 1. Criar Usuário
server.post(
    '/users',
    {
        schema: {
            body: z.object({
                full_name: z.string().min(3),
                email: z.string().email(),
                cpf: z.string().length(11), // Sem pontuação
            }),
        },
    },
    async (req, reply) => {
        try {
            const user = await ledgerService.createUser(req.body);
            return reply.status(201).send(user);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(409).send({ error: message });
        }
    }
);

// 2. Consultar Saldo
server.get(
    '/users/:id/balance',
    {
        schema: {
            params: z.object({
                id: z.string().uuid(),
            }),
        },
    },
    async (req, reply) => {
        try {
            const balance = await ledgerService.getBalance(req.params.id);
            return reply.send(balance);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(404).send({ error: message });
        }
    }
);

// 3. Fazer Depósito
server.post(
    '/transactions/deposit',
    {
        schema: {
            body: z.object({
                payee_id: z.string().uuid(),
                amount: z.number().int().positive(), // Inteiro positivo (centavos)
            }),
        },
    },
    async (req, reply) => {
        try {
            const result = await ledgerService.deposit(req.body);
            return reply.status(200).send(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(400).send({ error: message });
        }
    }
);

// 4. Fazer Transferência
server.post(
    '/transactions/transfer',
    {
        schema: {
            body: z.object({
                payer_id: z.string().uuid(),
                payee_id: z.string().uuid(),
                amount: z.number().int().positive(), // Inteiro positivo (centavos)
            }),
        },
    },
    async (req, reply) => {
        try {
            const result = await ledgerService.transfer(req.body);
            return reply.status(200).send(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(400).send({ error: message });
        }
    }
);

export default server;
