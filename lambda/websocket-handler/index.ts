import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId!;
  const routeKey = event.requestContext.routeKey;
  
  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(connectionId);
      case '$disconnect':
        return await handleDisconnect(connectionId);
      case '$default':
        return await handleMessage(connectionId, event.body);
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Unknown route' })
        };
    }
  } catch (error) {
    console.error('WebSocket error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

async function handleConnect(connectionId: string): Promise<APIGatewayProxyResult> {
  const params = {
    TableName: process.env.CONNECTION_TABLE!,
    Item: {
      connectionId,
      timestamp: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 86400 // 24 hours TTL
    }
  };

  await dynamodb.put(params).promise();
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Connected' })
  };
}

async function handleDisconnect(connectionId: string): Promise<APIGatewayProxyResult> {
  const params = {
    TableName: process.env.CONNECTION_TABLE!,
    Key: { connectionId }
  };

  await dynamodb.delete(params).promise();
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Disconnected' })
  };
}

async function handleMessage(connectionId: string, body: string | null): Promise<APIGatewayProxyResult> {
  if (!body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Message body is required' })
    };
  }

  // Echo message back for now
  // In a full implementation, this would handle chat messages, status updates, etc.
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: 'Message received',
      echo: JSON.parse(body)
    })
  };
}