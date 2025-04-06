import { users, transactions, type User, type InsertUser, type Transaction, type InsertTransaction } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, ftnDelta: number, lbrDelta: number): Promise<User | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number, limit?: number): Promise<Transaction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  currentUserId: number;
  currentTransactionId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    
    // Add a sample user for development
    this.createUser({
      username: "demo_user",
      password: "password123",
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      ftnBalance: 1000,
      lbrBalance: 500
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserBalance(userId: number, ftnDelta: number, lbrDelta: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ftnBalance: user.ftnBalance + ftnDelta,
      lbrBalance: user.lbrBalance + lbrDelta
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = { 
      ...insertTransaction, 
      id
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getUserTransactions(userId: number, limit = 10): Promise<Transaction[]> {
    const userTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    
    return userTransactions.slice(0, limit);
  }
}

export const storage = new MemStorage();
