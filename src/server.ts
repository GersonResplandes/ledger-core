import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { TransactionController } from './controllers/TransactionController';
import { userRoutes } from './controllers/UserController';
import { LedgerService } from './services/LedgerService'; // Import Service
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({
    logger: true,
}).withTypeProvider<ZodTypeProvider>();

// Setup Zod Validation
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

async function bootstrap() {
    // 1. Register Swagger (Docs)
    await app.register(fastifySwagger, {
        openapi: {
            info: {
                title: 'Ledger Core API',
                description: 'High-integrity financial transaction engine.',
                version: '1.0.0',
            },
            tags: [
                { name: 'Transactions', description: 'Core financial operations' },
                { name: 'Users', description: 'Account management' },
            ],
            // Add security definition (Simulated)
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    }
                }
            }
        },
    });

    await app.register(fastifySwaggerUi, {
        routePrefix: '/docs',
    });

    // 2. Dependency Injection (Composition Root)
    const ledgerService = new LedgerService();
    const transactionController = new TransactionController(ledgerService);

    // 2. Register Routes
    // Note: TransactionController now has a method registerRoutes, we need to wrap it or use register
    await app.register(async (instance) => {
        await transactionController.registerRoutes(instance);
    }, { prefix: '/transactions' });

    await app.register(userRoutes, { prefix: '/users' });

    // 3. Start Server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

    try {
        await app.ready();
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Server running on http://localhost:${port}`);
        console.log(`📚 Documentation at http://localhost:${port}/docs`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

bootstrap();
