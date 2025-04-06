import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for the roulette game
  const apiRouter = app.route("/api");

  // Fetch or create a user by wallet address
  app.post("/api/users/wallet/:address", async (req, res) => {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ message: "Wallet address is required" });
    }
    
    // Check if user already exists
    let user = await storage.getUserByUsername(address);
    
    // If not, create a new user with default balance
    if (!user) {
      user = await storage.createUser({
        username: address,
        walletAddress: address,
        ftnBalance: 100, // Default starting balance
        lbrBalance: 50,  // Default starting balance
        createdAt: new Date().toISOString()
      });
    }
    
    res.json({
      userId: user.id,
      ftnBalance: user.ftnBalance,
      lbrBalance: user.lbrBalance
    });
  });

  // Get user balance
  app.get("/api/user/:id/balance", async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      ftnBalance: user.ftnBalance,
      lbrBalance: user.lbrBalance
    });
  });

  // Process roulette spin and update balances
  app.post("/api/spin", async (req, res) => {
    const schema = z.object({
      userId: z.number(),
      betAmount: z.number(),
      betToken: z.string(),
      betColor: z.string(),
    });

    try {
      const data = schema.parse(req.body);
      
      // Get user
      const user = await storage.getUser(data.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough balance
      if (data.betToken === "FTN" && user.ftnBalance < data.betAmount) {
        return res.status(400).json({ message: "Insufficient FTN balance" });
      }
      if (data.betToken === "LBR" && user.lbrBalance < data.betAmount) {
        return res.status(400).json({ message: "Insufficient LBR balance" });
      }

      // Determine winner (This is a simulated RNG for the roulette)
      // The wheel has 33 slots: 16 violet, 16 black, 1 blue
      const randomNumber = Math.floor(Math.random() * 33);
      let resultColor = "blue"; // Default to blue (slot 32)
      
      if (randomNumber < 16) {
        resultColor = "violet";
      } else if (randomNumber < 32) {
        resultColor = "black";
      }

      const isWin = resultColor === data.betColor;
      
      // Calculate balance changes based on result
      let ftnDelta = 0;
      let lbrDelta = 0;
      
      if (data.betToken === "FTN") {
        if (isWin) {
          // Win with FTN: 2x gain
          ftnDelta = data.betAmount;
        } else {
          // Loss with FTN: lose bet but gain LBR
          ftnDelta = -data.betAmount;
          lbrDelta = data.betAmount;
        }
      } else if (data.betToken === "LBR") {
        if (isWin) {
          // Win with LBR: 1x FTN gain
          ftnDelta = data.betAmount;
        } else {
          // Loss with LBR: total loss
          lbrDelta = -data.betAmount;
        }
      }

      // Update user balance
      const updatedUser = await storage.updateUserBalance(
        data.userId, 
        ftnDelta, 
        lbrDelta
      );

      // Record transaction
      const transaction = await storage.createTransaction({
        userId: data.userId,
        betAmount: data.betAmount,
        betToken: data.betToken,
        betColor: data.betColor,
        result: isWin ? "win" : "loss",
        timestamp: new Date().toISOString()
      });

      // Return result
      res.json({
        result: isWin ? "win" : "loss",
        resultColor,
        ftnDelta,
        lbrDelta,
        updatedBalances: {
          ftnBalance: updatedUser?.ftnBalance,
          lbrBalance: updatedUser?.lbrBalance
        },
        transaction
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data", error });
    }
  });

  // Get user transaction history
  app.get("/api/user/:id/transactions", async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const transactions = await storage.getUserTransactions(userId, limit);
    
    res.json(transactions);
  });

  const httpServer = createServer(app);
  return httpServer;
}
