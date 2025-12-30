import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { LedgerService } from '../services/LedgerService';

const ledgerService = new LedgerService();

export async function userRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    // POST /users
    server.post(
        '/',
        {
            schema: {
                summary: 'Create User',
                tags: ['Users'],
                body: z.object({
                    full_name: z.string().min(3),
                    email: z.string().email(),
                    cpf: z.string().min(11),
                }),
                response: {
                    201: z.object({
                        id: z.string().uuid(),
                        full_name: z.string(),
                    }),
                    409: z.object({
                        message: z.string(),
                    }),
                },
            },
        },
        async (req, reply) => {
            try {
                const user = await ledgerService.createUser(req.body);
                return reply.status(201).send(user);
            } catch (error) {
                if (error instanceof Error && error.message === 'User already exists') {
                    return reply.status(409).send({ message: 'User already exists' });
                }
                throw error;
            }
        }
    );

    // GET /users/:id/balance
    server.get(
        '/:id/balance',
        {
            schema: {
                summary: 'Get Balance',
                tags: ['Users'],
                params: z.object({
                    id: z.string().uuid(),
                }),
                response: {
                    200: z.object({
                        balance: z.number().int(),
                    }),
                    404: z.object({
                        message: z.string(),
                    }),
                },
            },
        },
        async (req, reply) => {
            try {
                const balance = await ledgerService.getBalance(req.params.id);
                return reply.send(balance);
            } catch (error) {
                if (error instanceof Error && error.message === 'User not found') {
                    return reply.status(404).send({ message: 'User not found' });
                }
                throw error;
            }
        }
    );
}
