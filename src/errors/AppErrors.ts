export class AppError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        // Restaura a cadeia de protótipos (importante para instanceof funcionar ao transpilar TS)
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InsufficientFundsError extends AppError {
    constructor(message = 'Insufficient funds') {
        super(message, 400);
    }
}

export class UserNotFoundError extends AppError {
    constructor(message = 'User not found') {
        super(message, 404);
    }
}

export class InvalidTransactionError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}
