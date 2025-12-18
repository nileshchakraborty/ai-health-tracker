import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { typeDefs, resolvers, GraphQLContext } from '@/graphql';
import { getAdapterContext } from '@/adapters/factory';

// Create Apollo Server
const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
});

// Create handler with context
const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(server, {
    context: async () => getAdapterContext(),
});

export async function GET(request: NextRequest) {
    return handler(request);
}

export async function POST(request: NextRequest) {
    return handler(request);
}
