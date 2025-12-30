import { Generated, ColumnType } from 'kysely';

// Tipos auxiliares para Colunas com Defaults (Created At, ID)
// Selectable: O que vem do banco
// Insertable: O que enviamos (opcional se tiver default)
// Updateable: O que podemos atualizar

export interface UserTable {
    // UUID gerado pelo banco ou pela app
    id: Generated<string>;
    full_name: string;
    email: string;
    // CPF único. String para manter zeros à esquerda
    cpf: string;
    // Saldo em CENTAVOS (Integer) para evitar erro de float.
    // Ex: R$ 10,00 -> 1000
    balance: number;
    created_at: ColumnType<Date, string | undefined, never>;
}

export interface TransactionTable {
    id: Generated<string>;
    payer_id: string; // Quem paga
    payee_id: string; // Quem recebe
    amount: number; // Valor em centavos
    type: 'DEPOSIT' | 'TRANSFER' | 'REVERSAL';
    created_at: ColumnType<Date, string | undefined, never>;
}

// Essa interface representa o banco inteiro
export interface Database {
    users: UserTable;
    transactions: TransactionTable;
}
