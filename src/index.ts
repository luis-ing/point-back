import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import cors from 'cors';
import { PubSub } from 'graphql-subscriptions';
import dotenv from 'dotenv';

import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { AuthUtils } from './utils/auth';
import { PrismaClient } from '@prisma/client';

// Cargar variables de entorno
dotenv.config();

// Instancia global de PubSub para subscriptions
export const pubsub = new PubSub();

// Instancia de Prisma
export const prisma = new PrismaClient();

// Crear esquema ejecutable
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // Configurar WebSocket Server para subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Configurar servidor de subscriptions
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // Extraer token del contexto de conexión
        const token = ctx.connectionParams?.authorization as string;
        return AuthUtils.getContext(token);
      },
    },
    wsServer
  );

  // Crear servidor Apollo
  const server = new ApolloServer({
    schema,
    plugins: [
      // Drenaje apropiado del servidor HTTP
      ApolloServerPluginDrainHttpServer({ httpServer }),
      
      // Limpieza apropiada del servidor WebSocket
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
        path: error.path,
      };
    },
  });

  // Iniciar servidor Apollo
  await server.start();

  // Middlewares
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization;
        return AuthUtils.getContext(authHeader);
      },
    })
  );

  // Ruta de salud
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Puerto
  const PORT = process.env.PORT || 4000;
  console.log("Puerto: ------- ", PORT);
  // Iniciar servidor
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor GraphQL listo en http://localhost:${PORT}/graphql`);
    console.log(`🔌 Subscriptions WebSocket en ws://localhost:${PORT}/graphql`);
  });

  // Manejo de señales para cierre graceful
  process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    await serverCleanup.dispose();
    await prisma.$disconnect();
    httpServer.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT recibido, cerrando servidor...');
    await serverCleanup.dispose();
    await prisma.$disconnect();
    httpServer.close();
    process.exit(0);
  });
}

// Iniciar servidor
startServer().catch((error) => {
  console.error('Error iniciando servidor:', error);
  process.exit(1);
});