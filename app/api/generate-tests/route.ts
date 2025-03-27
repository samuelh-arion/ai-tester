import { NextResponse } from 'next/server'

export const runtime = 'edge'

function generateStepDefinitions() {
  return `const { When, Then } = require('@cucumber/cucumber');
const axios = require('axios');
const { expect } = require('chai');
const env = process.env;

let response;

// Configure axios defaults
const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Authorization': \`Bearer \${env.API_TOKEN}\`
  }
});

When('I make a GET request to {string}', async function(url) {
  response = await api.get(url);
});

When('I make a POST request to {string} with:', async function(url, body) {
  const data = JSON.parse(body);
  response = await api.post(url, data);
});

Then('the response status code should be {int}', function(statusCode) {
  expect(response.status).to.equal(statusCode);
});

Then('the response should have the following data:', function(dataTable) {
  const expectedData = dataTable.rowsHash();
  
  Object.keys(expectedData).forEach(key => {
    expect(response.data[key]).to.equal(expectedData[key]);
  });
});

Then('the response should contain {string} with value {string}', function(field, value) {
  expect(response.data[field]).to.equal(value);
});`;
}

export async function POST(request: Request) {
  try {
    const { feature } = await request.json()
    
    if (!feature) {
      throw new Error('No feature content provided')
    }

    // Return the static step definitions
    const stepDefinitions = generateStepDefinitions()

    return NextResponse.json({ 
      success: true,
      stepDefinitionContent: stepDefinitions
    })
  } catch (error) {
    console.error('Error generating tests:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate tests' 
      },
      { status: 400 }
    )
  }
} 