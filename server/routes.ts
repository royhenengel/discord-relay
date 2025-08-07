import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { discordBot } from "./services/discord-bot";
import { insertRelayConfigSchema, insertBotConfigSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Bot status routes
  app.get("/api/bot/status", async (req, res) => {
    try {
      const stats = await storage.getBotStats();
      const status = discordBot.getStatus();
      res.json({ ...stats, ...status });
    } catch (error) {
      res.status(500).json({ message: "Failed to get bot status" });
    }
  });

  app.post("/api/bot/connect", async (req, res) => {
    try {
      await discordBot.connect();
      res.json({ message: "Bot connected successfully" });
    } catch (error) {
      res.status(500).json({ message: `Failed to connect bot: ${error}` });
    }
  });

  app.post("/api/bot/disconnect", async (req, res) => {
    try {
      await discordBot.disconnect();
      res.json({ message: "Bot disconnected successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to disconnect bot" });
    }
  });

  // Relay configuration routes
  app.get("/api/relays", async (req, res) => {
    try {
      const relays = await storage.getRelayConfigs();
      res.json(relays);
    } catch (error) {
      res.status(500).json({ message: "Failed to get relay configurations" });
    }
  });

  app.post("/api/relays", async (req, res) => {
    try {
      const validatedData = insertRelayConfigSchema.parse(req.body);
      const relay = await storage.createRelayConfig(validatedData);
      res.json(relay);
    } catch (error) {
      res.status(400).json({ message: `Invalid relay configuration: ${error}` });
    }
  });

  app.put("/api/relays/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertRelayConfigSchema.partial().parse(req.body);
      const relay = await storage.updateRelayConfig(id, validatedData);
      
      if (!relay) {
        return res.status(404).json({ message: "Relay not found" });
      }
      
      res.json(relay);
    } catch (error) {
      res.status(400).json({ message: `Invalid relay configuration: ${error}` });
    }
  });

  app.delete("/api/relays/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteRelayConfig(id);
      
      if (!success) {
        return res.status(404).json({ message: "Relay not found" });
      }
      
      res.json({ message: "Relay deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete relay" });
    }
  });

  // Activity logs routes
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get activity logs" });
    }
  });

  app.delete("/api/logs", async (req, res) => {
    try {
      await storage.clearActivityLogs();
      res.json({ message: "Activity logs cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear activity logs" });
    }
  });

  // Bot configuration routes
  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getBotConfig();
      // Don't expose the full bot token
      if (config?.botToken) {
        config.botToken = "************************";
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bot configuration" });
    }
  });

  app.put("/api/config", async (req, res) => {
    try {
      const validatedData = insertBotConfigSchema.partial().parse(req.body);
      const config = await storage.updateBotConfig(validatedData);
      
      // Don't expose the full bot token in response
      if (config?.botToken) {
        config.botToken = "************************";
      }
      
      res.json(config);
    } catch (error) {
      res.status(400).json({ message: `Invalid bot configuration: ${error}` });
    }
  });

  // Stats update route (for periodic updates)
  app.post("/api/stats/update", async (req, res) => {
    try {
      await discordBot.updateUptime();
      const stats = await storage.getBotStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to update stats" });
    }
  });

  const httpServer = createServer(app);

  // Initialize Discord bot on server start
  try {
    await discordBot.connect();
    console.log("Discord bot initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Discord bot:", error);
  }

  return httpServer;
}
