// Common step definitions template
export const defaultStepDefinitions = `// Common step definitions that can be used across scenarios
export const commonSteps = {
  // API Request Steps
  'I send a GET request to "$path"': async (path: string) => {
    // Implement your GET request logic here
    console.log('Sending GET request to:', path)
    await new Promise(resolve => setTimeout(resolve, 500))
    return true
  },

  'I send a POST request to "$path"': async (path: string) => {
    // Implement your POST request logic here
    console.log('Sending POST request to:', path)
    await new Promise(resolve => setTimeout(resolve, 500))
    return true
  },

  // Response Validation Steps
  'the response status code should be $code': async (code: string) => {
    // Implement status code validation here
    console.log('Validating status code:', code)
    return true
  },

  'the response should match schema "$schema"': async (schema: string) => {
    // Implement schema validation here
    console.log('Validating schema:', schema)
    return true
  },

  'the response should contain "$field"': async (field: string) => {
    // Implement response field validation here
    console.log('Checking response field:', field)
    return true
  }
}`

// Hooks template
export const defaultHooks = `import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { CustomWorld } from './world';

BeforeAll(async () => {
  // Setup global test environment
  console.log('Starting test suite...');
});

Before(async function(this: CustomWorld) {
  // Reset world state before each scenario
  this.response = null;
  this.userId = '';
  this.headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
});

After(async function(this: CustomWorld) {
  // Cleanup after each scenario
  this.response = null;
  this.userId = '';
});

AfterAll(async () => {
  // Cleanup global resources
  console.log('Test suite completed.');
});`

// World template
export const defaultWorld = `import { setWorldConstructor, World } from '@cucumber/cucumber';
import { config } from './config';

export interface CustomWorld extends World {
  response: any;
  userId: string;
  headers: Record<string, string>;
  testData: any;
  buildUrl(path: string): string;
  makeRequest(method: string, path: string, body?: any): Promise<any>;
}

export class CustomWorldImpl implements CustomWorld {
  response: any;
  userId: string;
  headers: Record<string, string>;
  testData: any;

  constructor(options: { parameters: { env?: string } }) {
    const env = options.parameters.env || 'development';
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
    return \`\${apiBaseUrl}/\${apiVersion}\${path}\`;
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
      throw new Error(\`Request failed: \${error.message}\`);
    }
  }
}

setWorldConstructor(CustomWorldImpl);`

// Utils template
export const defaultUtils = `// Utility functions for test automation
export const utils = {
  // Wait for a specified time
  sleep: async (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Generate random data
  generateRandomString: (length: number) => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  // Parse JSON safely
  parseJSON: (str: string) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  },

  // Deep compare objects
  deepEqual: (obj1: any, obj2: any) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  },

  // Format date for consistent testing
  formatDate: (date: Date) => {
    return date.toISOString();
  }
};` 