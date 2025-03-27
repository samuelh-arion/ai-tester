import { TestDefinition, TestResult, TestEnvironment, CustomWorld } from './types';
// Remove the cucumber imports since we're in browser environment
// import { setWorldConstructor, World } from '@cucumber/cucumber';
import { expect } from 'chai';

export class BrowserTestRunner {
  private currentWorld: CustomWorld;

  constructor(private environment: TestEnvironment) {
    // Initialize with our own CustomWorld implementation
    this.currentWorld = {
      apiResponse: new Response(null, {
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      }),
      requestHeaders: {},
      environment: environment
    };
  }

  async runTest(testDef: TestDefinition): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Validate environment variables
    this.validateEnvironment(testDef.envVars);

    for (const scenario of testDef.feature.scenarios) {
      const scenarioResult: TestResult = {
        scenarioName: scenario.name,
        steps: [],
        duration: 0
      };

      try {
        // Run before hooks if present
        if (testDef.hooks?.before) {
          await this.executeHook(testDef.hooks.before);
        }

        const startTime = Date.now();

        // Execute each step
        for (const step of scenario.steps) {
          const stepStartTime = Date.now();
          try {
            // Create the step function from the implementation string
            const stepFn = new Function(
              'world',
              'expect',
              'params',
              step.implementation
            );

            await stepFn(this.currentWorld, expect, step.params);

            scenarioResult.steps.push({
              text: step.text,
              status: 'passed',
              duration: Date.now() - stepStartTime
            });
          } catch (error) {
            scenarioResult.steps.push({
              text: step.text,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - stepStartTime
            });
            break;
          }
        }

        scenarioResult.duration = Date.now() - startTime;

        // Run after hooks if present
        if (testDef.hooks?.after) {
          await this.executeHook(testDef.hooks.after);
        }
      } catch (error) {
        console.error('Error running scenario:', error);
      }

      results.push(scenarioResult);
    }

    return results;
  }

  private validateEnvironment(requiredVars: string[]): void {
    const missing = requiredVars.filter(
      varName => !(varName in this.environment.variables)
    );
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }
  }

  private async executeHook(hookImpl: string): Promise<void> {
    const hookFn = new Function('world', 'expect', hookImpl);
    await hookFn(this.currentWorld, expect);
  }
}

// Helper function to create a test definition from Gherkin
export function createTestDefinition(
  feature: string,
  implementations: Record<string, string>
): TestDefinition {
  // This will be implemented by the API to convert Gherkin to our test definition format
  throw new Error('Not implemented');
} 