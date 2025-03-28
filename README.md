# AI API Tester

A modern web application for testing and validating APIs using AI-powered tools. Built with Next.js and deployed on Cloudflare Pages.

## 🚀 Tech Stack

### Frontend

- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TailwindCSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components library
- **Monaco Editor** - Code editor component
- **Zustand** - State management
- **Axios** - HTTP client

### Backend & Infrastructure

- **Cloudflare Pages** - Hosting and deployment platform
- **Cloudflare Workers** - Serverless functions
- **OpenAI SDK** - AI integration for test generation
- **Zod** - Structured Outputs

### Testing & Development

- **Cucumber.js** - Behavior Driven Development (BDD) testing
- **TypeScript** - Type safety and developer experience
- **ESLint** - Code linting

## 🔄 Application Flow & Features

### OpenAPI Processing

1. Upload OpenAPI specification files
2. Automatic validation and analysis
3. Storage in browser's IndexedDB for persistence

### AI-Powered Test Generation

1. Intelligent analysis of OpenAPI endpoints and schemas
2. Automatic generation of comprehensive test scenarios using OpenAI
3. Coverage-focused test case creation:
   - Happy path scenarios
   - Edge cases and error conditions
   - Data validation tests
   - Authentication and authorization tests
4. Natural language test descriptions in Gherkin syntax
5. Smart test data generation based on schema types

### Test Generation & Management

1. Automatic Gherkin feature generation from OpenAPI specs
2. Real-time feature file editing with Monaco Editor
3. Custom scenario and step addition
4. Test suite management (download/upload)

### Environment Configuration

- Multiple environment support (Development, Staging, Production)
- Per-environment configuration:
  - Base URLs
  - Authentication settings
  - Custom headers
  - Request timeouts

### Authentication Support

- Multiple auth methods:
  - API Keys
  - OAuth 2.0
  - Bearer Tokens
  - Basic Auth
- Secure credential storage
- Environment-specific authentication

### Test Data Management

- Create and import test data sets (CSV/JSON)
- Link data sets to test cases
- Variable support in test scenarios
- Data persistence in IndexedDB

### Test Execution & Reporting

- Run tests against configured environments
- Real-time test execution results
- Comprehensive reporting:
  - Test execution history
  - Success/failure rates
  - Response time statistics
  - API endpoint coverage
- Export reports in multiple formats

## 🏗️ Architecture

### Frontend

- React Components with Shadcn/ui + Tailwind CSS
- State Management: Zustand for local state
- Storage: Browser's IndexedDB for:
  - OpenAPI specs
  - Generated features
  - Test results
  - Environment configs
- Monaco Editor for feature editing

### Backend (Edge Runtime)

- Next.js API Routes on Cloudflare Pages
- Key Endpoints:
  - `POST /api/validate-password`: Password validation and security checks
  - `POST /api/generate-features`: AI-powered feature file generation from OpenAPI specs
  - `POST /api/generate-tests`: AI-powered test case generation
- Stateless architecture

### Security

- Built-in Next.js security features
- Cloudflare rate limiting
- Request size limits
- Input validation with Zod

## 🛠️ Setup & Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone [repository-url]
cd ai-tester
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables

The following environment variables are required:

- `OPENAI_API_KEY` - Your OpenAI API key

4. Start the development server

```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## 📦 Deployment

The project is configured for deployment on Cloudflare Pages.

### Deploy to Production

```bash
npm run deploy
```

This command will:

1. Build the Next.js application
2. Prepare for Cloudflare Pages
3. Deploy to your Cloudflare Pages site

The following environment variables are required:

- `OPENAI_API_KEY` - Your OpenAI API key

## 📚 Project Structure

```
ai-tester/
├── app/           # Next.js app router pages and layouts
├── components/    # Reusable React components
├── lib/          # Utility functions and shared logic
├── public/       # Static assets
└── middleware.ts # Next.js middleware configuration
```
