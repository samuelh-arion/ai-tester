interface EnvironmentConfig {
  apiBaseUrl: string;
  apiVersion: string;
}

interface Config {
  [key: string]: EnvironmentConfig;
}

export const config: Config = {
  development: {
    apiBaseUrl: 'http://localhost:3000',
    apiVersion: 'v1'
  },
  staging: {
    apiBaseUrl: 'https://staging-api.example.com',
    apiVersion: 'v1'
  },
  production: {
    apiBaseUrl: 'https://api.example.com',
    apiVersion: 'v1'
  }
}; 