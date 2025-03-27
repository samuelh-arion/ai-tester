// import { World } from '@cucumber/cucumber';

export interface TestStep {
  type: 'Given' | 'When' | 'Then' | 'And';
  text: string;
  implementation: string;
  params?: Record<string, any>;
}

export interface TestScenario {
  name: string;
  steps: TestStep[];
}

export interface TestFeature {
  name: string;
  description?: string;
  scenarios: TestScenario[];
}

export interface TestDefinition {
  feature: TestFeature;
  hooks?: {
    before?: string;
    after?: string;
    beforeEach?: string;
    afterEach?: string;
  };
  envVars: string[]; // List of required environment variables
}

export interface TestResult {
  scenarioName: string;
  steps: Array<{
    text: string;
    status: 'passed' | 'failed' | 'skipped';
    error?: string;
    duration: number;
  }>;
  duration: number;
}

export interface TestEnvironment {
  name: string;
  variables: Record<string, string>;
  baseUrl: string;
  headers?: Record<string, string>;
}

// Custom World interface for our tests - browser compatible version
export interface CustomWorld {
  apiResponse: Response;
  requestHeaders: Record<string, string>;
  environment: TestEnvironment;
} 