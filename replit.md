# Discord Bot Relay Dashboard

## Overview

This is a full-stack Discord bot application that provides message relay functionality between Discord channels through a web-based dashboard. The system allows users to configure channel-to-channel message relays, monitor bot activity, and manage bot settings through a modern React interface styled with Discord-like theming.

The application consists of a React frontend built with Vite, an Express.js backend API, and uses PostgreSQL with Drizzle ORM for data persistence. The bot integrates with Discord's API using discord.js to handle real-time message relaying between configured channels.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom Discord-themed color palette and component variants
- **Form Handling**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript
- **API Design**: RESTful API endpoints for bot management, relay configuration, and activity logging
- **Database Integration**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Real-time Features**: Discord.js client for WebSocket connections to Discord API
- **Development Tools**: Hot module replacement via Vite middleware in development mode

### Data Storage Solutions
- **Primary Database**: PostgreSQL with the following schema structure:
  - `relay_configs`: Channel relay configuration with bidirectional support
  - `activity_logs`: Bot activity tracking with message types (RELAY, CMD, INFO, WARN, ERROR)
  - `bot_stats`: Runtime statistics including uptime, message counts, and connection status
  - `bot_config`: Bot configuration including tokens, rate limits, and logging preferences
- **Fallback Storage**: In-memory storage implementation for development/testing environments
- **Migration System**: Drizzle Kit for database schema migrations and version control

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Bot Authentication**: Discord bot token-based authentication for API interactions
- **API Security**: Request logging middleware with response time tracking and JSON sanitization

### External Service Integrations
- **Discord API**: Full integration via discord.js v14 for:
  - Guild and channel management
  - Message sending and receiving
  - Real-time event handling (message creation, bot connect/disconnect)
  - WebSocket connection management with automatic reconnection
- **Database Service**: Neon PostgreSQL serverless database with connection pooling
- **Development Services**: Replit-specific integrations for development environment support

### Key Architectural Decisions

**Monorepo Structure**: The application uses a shared TypeScript configuration with separate client, server, and shared directories. This allows for type sharing between frontend and backend while maintaining clear separation of concerns.

**Database Layer Abstraction**: Implements an IStorage interface that allows switching between PostgreSQL and in-memory storage, providing flexibility for different deployment environments and testing scenarios.

**Real-time Data Synchronization**: Uses React Query with automatic refetching intervals to keep the dashboard synchronized with bot state and activity logs without requiring WebSocket connections from the client.

**Component-Based UI Architecture**: Leverages shadcn/ui's component system with custom Discord theming to create a cohesive user interface that matches Discord's visual design language.

**Error Handling Strategy**: Implements comprehensive error boundaries with toast notifications for user feedback and structured error logging for debugging and monitoring purposes.