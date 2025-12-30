import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { LedgerService } from '../services/LedgerService';
import { AppError, InsufficientFundsError, InvalidTransactionError, UserNotFoundError } from '../errors/AppErrors';

// Extend FastifyRequest to include user - simulating AuthGuard
declare module 'fastify' {
    interface FastifyRequest {
        user: {
            id: string;
        };
    }
}

export class TransactionController {
    constructor(private ledgerService: LedgerService) { }

    async registerRoutes(app: FastifyInstance) {
        const server = app.withTypeProvider<ZodTypeProvider>();

        // Middleware Simulado de Autenticação (Para demonstração)
        server.addHook('preHandler', async (req) => {
            // MOCK: Assumindo que o usuário está logado via JWT
        });

        server.post(
            '/transfer',
            {
                schema: {
                    summary: 'Execute a P2P Transfer',
                    description: 'Transfers money between two users with ACID guarantees.',
                    tags: ['Transactions'],
                    body: z.object({
                        // payer_id REMOVIDO do body (Segurança)
                        payee_id: z.string().uuid(),
                        amount: z.number().int().positive('Amount must be positive'),
                    }),
                    response: {
                        200: z.object({
                            transaction_id: z.string().uuid(),
                            payer_balance: z.number(),
                        }),
                        400: z.object({
                            message: z.string(),
                        }),
                    },
                },
            },
            async (req, reply) => {
                const { payee_id, amount } = req.body;

                // 🔒 SECURITY: Payer ID vem do Token JWT, não do body
                if (!req.user?.id) {
                    return reply.status(401).send({ message: 'Unauthorized' });
                }
                const payer_id = req.user.id;

                try {
                    const result = await this.ledgerService.transfer({
                        payer_id,
                        payee_id,
                        amount,
                    });
                    return reply.status(200).send(result);
                } catch (error) {
                    if (error instanceof AppError) {
                        return reply.status(error.statusCode).send({ message: error.message });
                    }
                    // Log unknown error
                    console.error(error);
                    return reply.status(500).send({ message: 'Internal Server Error' });
                }
            }
        );

        server.post(
            '/deposit',
            {
                schema: {
                    summary: 'Deposit Money (Mock)',
                    description: 'Adds balance to a user wallet. Simulates an external cash-in.',
                    tags: ['Transactions'],
                    body: z.object({
                        payee_id: z.string().uuid(),
                        amount: z.number().int().positive(),
                    }),
                    response: {
                        200: z.object({
                            balance: z.number(),
                        }),
                        400: z.object({
                            message: z.string(),
                        }),
                        500: z.object({
                            message: z.string(),
                        }),
                    },
                },
            },
            async (req, reply) => {
                try {
                    const result = await this.ledgerService.deposit(req.body);
                    return reply.status(200).send(result);
                } catch (error) {
                    if (error instanceof AppError) {
                        return reply.status(error.statusCode).send({ message: error.message });
                    }
                    console.error(error);
                    return reply.status(500).send({ message: 'Internal Server Error' });
                }
            }
        );
    }
}
