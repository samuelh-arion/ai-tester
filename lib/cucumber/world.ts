import { World, IWorld, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
import { config } from './config';

export interface CustomWorld extends IWorld {
  response: any;
  userId: string;
  headers: Record<string, string>;
  testData: any;
  buildUrl(path: string): string;
  makeRequest(method: string, path: string, body?: any): Promise<any>;
}

export class CustomWorldImpl extends World implements CustomWorld {
  response: any;
  userId: string;
  headers: Record<string, string>;
  testData: any;

  constructor(options: IWorldOptions) {
    super(options);
    const env = options.parameters?.env || 'development';
    const envConfig = config[env];

    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    this.testData = {
      validUserId: '123',
      validUserData: {
        username: 'testuser',
        email: 'test@example.com'
      }
    };

    this.response = null;
    this.userId = '';
  }

  buildUrl(path: string): string {
    const env = process.env.NODE_ENV || 'development';
    const { apiBaseUrl, apiVersion } = config[env];
    return `${apiBaseUrl}/${apiVersion}${path}`;
  }

  async makeRequest(method: string, path: string, body?: any): Promise<any> {
    const url = this.buildUrl(path);
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined
      });
      this.response = response;
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Request failed: ${errorMessage}`);
    }
  }
}

setWorldConstructor(CustomWorldImpl); 