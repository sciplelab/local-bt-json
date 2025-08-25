declare module '@hono/node-server/aws-lambda' {
  import { Hono } from 'hono';
  import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
  export function handle(app: Hono<any>): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;
}