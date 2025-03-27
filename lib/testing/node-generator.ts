import { TestDefinition } from './types';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export class NodeTestGenerator {
  constructor(private outputDir: string) {
    mkdirSync(outputDir, { recursive: true });
  }

  generateTests(testDef: TestDefinition): void {
    // Generate feature file
    const featureContent = this.generateFeatureFile(testDef);
    writeFileSync(
      join(this.outputDir, `${testDef.feature.name}.feature`),
      featureContent
    );

    // Generate step definitions
    const stepDefsContent = this.generateStepDefinitions(testDef);
    writeFileSync(
      join(this.outputDir, `${testDef.feature.name}.steps.ts`),
      stepDefsContent
    );

    // Generate environment configuration
    this.generateEnvironmentConfig(testDef);
  }

  private generateFeatureFile(testDef: TestDefinition): string {
    const { feature } = testDef;
    let content = `Feature: ${feature.name}\n`;

    if (feature.description) {
      content += `${feature.description}\n\n`;
    }

    feature.scenarios.forEach(scenario => {
      content += `Scenario: ${scenario.name}\n`;
      scenario.steps.forEach(step => {
        content += `  ${step.type} ${step.text}\n`;
      });
      content += '\n';
    });

    return content;
  }

  private generateStepDefinitions(testDef: TestDefinition): string {
    const imports = `
import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from 'chai';
import { CustomWorld } from './types';
    `.trim();

    let content = `${imports}\n\n`;

    // Add hooks
    if (testDef.hooks) {
      if (testDef.hooks.before) {
        content += `Before(async function(this: CustomWorld) {\n${testDef.hooks.before}\n});\n\n`;
      }
      if (testDef.hooks.after) {
        content += `After(async function(this: CustomWorld) {\n${testDef.hooks.after}\n});\n\n`;
      }
    }

    // Add step implementations
    const implementedSteps = new Set<string>();
    testDef.feature.scenarios.forEach(scenario => {
      scenario.steps.forEach(step => {
        if (!implementedSteps.has(step.text)) {
          content += `${step.type}('${step.text}', async function(this: CustomWorld) {\n`;
          content += `${step.implementation}\n`;
          content += '});\n\n';
          implementedSteps.add(step.text);
        }
      });
    });

    return content;
  }

  private generateEnvironmentConfig(testDef: TestDefinition): void {
    const envConfig = {
      requiredVars: testDef.envVars,
      cucumber: {
        requireModule: ['ts-node/register'],
        require: ['./**/*.steps.ts'],
        format: ['json:cucumber-report.json', 'html:cucumber-report.html']
      }
    };

    writeFileSync(
      join(this.outputDir, 'cucumber.js'),
      `module.exports = ${JSON.stringify(envConfig, null, 2)};`
    );
  }
} 