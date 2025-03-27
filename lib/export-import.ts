import JSZip from 'jszip';

const PACKAGE_JSON = `{
  "name": "cucumber-api-tests",
  "version": "1.0.0",
  "description": "API Testing Suite using Cucumber.js",
  "scripts": {
    "test": "cucumber-js",
    "test:dev": "dotenv -e .env-dev -- cucumber-js",
    "test:local": "dotenv -e .env-local -- cucumber-js",
    "test:prod": "dotenv -e .env-prod -- cucumber-js"
  },
  "dependencies": {
    "@cucumber/cucumber": "^10.0.1",
    "chai": "^4.3.10",
    "dotenv": "^16.3.1",
    "dotenv-cli": "^7.3.0"
  }
}`;

const GITIGNORE = `node_modules/
.env*
!.env-example
`;

const ENV_EXAMPLE = `# Example Environment Variables
API_URL=http://localhost:3000
TEST_USERNAME=test_user
TEST_PASSWORD=test_pass
DEBUG=true
LOG_LEVEL=debug`;

const README_MD = `# API Test Suite

This test suite contains Cucumber.js-based API tests generated from your feature files.

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up your environment files:
   - Copy \`.env-example\` to create your environment files
   - Create the following files based on your needs:
     - \`.env-dev\` for development environment
     - \`.env-local\` for local environment
     - \`.env-prod\` for production environment

## Running Tests

The test suite supports different environments through separate environment files. Use the following commands to run tests with specific environment configurations:

### Development Environment
\`\`\`bash
npm run test:dev
\`\`\`
This command will load variables from \`.env-dev\` before running the tests.

### Local Environment
\`\`\`bash
npm run test:local
\`\`\`
This command will load variables from \`.env-local\` before running the tests.

### Production Environment
\`\`\`bash
npm run test:prod
\`\`\`
This command will load variables from \`.env-prod\` before running the tests.

### Running Without Environment File
\`\`\`bash
npm test
\`\`\`
This will run the tests without loading any specific environment file.

## Project Structure

- \`features/\`: Contains Gherkin feature files defining test scenarios
- \`tests/\`: Contains generated Cucumber.js test implementations
- \`.env-*\`: Environment-specific configuration files
- \`.env-example\`: Template for environment configuration

## Adding New Tests

1. Add new feature files in the \`features/\` directory
2. Implement corresponding step definitions in the \`tests/\` directory
3. Run tests using the appropriate environment command

## Best Practices

1. Never commit environment files (\`.env-*\`) to version control
2. Keep sensitive data in environment files, not in the test code
3. Use different environment files for different deployment targets
4. Always update \`.env-example\` when adding new required variables`;

export async function exportTestSuite(features: Record<string, string>, tests: Record<string, string>, envFiles: Record<string, string>) {
  const zip = new JSZip();

  // Add features
  const featuresFolder = zip.folder("features");
  Object.entries(features).forEach(([name, content]) => {
    featuresFolder?.file(name, content);
  });

  // Add tests
  const testsFolder = zip.folder("tests");
  Object.entries(tests).forEach(([name, content]) => {
    testsFolder?.file(name, content);
  });

  // Add env files
  Object.entries(envFiles).forEach(([name, content]) => {
    zip.file(name, content);
  });

  // Add static files
  zip.file("package.json", PACKAGE_JSON);
  zip.file(".gitignore", GITIGNORE);
  zip.file(".env-example", ENV_EXAMPLE);
  zip.file("README.md", README_MD);

  // Generate zip file
  const content = await zip.generateAsync({ type: "blob" });
  
  // Trigger download
  const url = window.URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "api-test-suite.zip";
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function importTestSuite(file: File): Promise<{
  features: Record<string, string>;
  tests: Record<string, string>;
  envFiles: Record<string, string>;
}> {
  const zip = await JSZip.loadAsync(file);
  const features: Record<string, string> = {};
  const tests: Record<string, string> = {};
  const envFiles: Record<string, string> = {};

  // Helper function to read file content
  const readFile = async (file: JSZip.JSZipObject) => {
    return await file.async("string");
  };

  // Process all files
  for (const [path, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      const content = await readFile(file);
      
      if (path.startsWith('features/')) {
        features[path.replace('features/', '')] = content;
      } else if (path.startsWith('tests/')) {
        tests[path.replace('tests/', '')] = content;
      } else if (path.startsWith('.env')) {
        envFiles[path] = content;
      }
    }
  }

  return { features, tests, envFiles };
} 