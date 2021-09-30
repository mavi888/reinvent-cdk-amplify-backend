import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export async function handler(event: any, context: Context): Promise<any> {
    console.log('start lambda function');

    console.log(event);
  }