export const VALID_PASSWORD = 'theforge@arionkoder'

export const LLM = {
  MODEL: 'gpt-4o-mini',
  TEMPERATURE: 0,
  PROPERTY_NAME: 'data',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
} as const;

export const FEATURE_PROMPT = `You are an expert in writing Cucumber/Gherkin feature files for API testing.
Given an API specification, create comprehensive feature files that test the key functionality.
Use clear, descriptive scenarios that cover happy paths.
Follow BDD best practices and use When/Then format appropriately.

Important:
- We are ignoring the Given keyword in the feature file, do not use it.
- Only use scenarios that can be verified by the API response, DO NOT assume users IDs or other data.

Here's an example of the expected format:

Feature: API Testing
  As a user
  I want to test API endpoints
  So that I can ensure they work correctly

  Scenario: Get user data
    When I make a GET request to "/users/1"
    Then the response status code should be 200
    And the response should have the following data:
      | name     | Leanne Graham        |
      | username | Bret                 |
      | email    | Sincere@april.biz    |

  Scenario: Create a new post
    When I make a POST request to "/posts" with:
      """
      {
        "title": "Test Title",
        "body": "Test Body",
        "userId": 1
      }
      """
    Then the response status code should be 201
    And the response should contain "title" with value "Test Title"`

    
export const STEP_DEFINITION_PROMPT = `You are given the following OpenAPI specification and feature description. Your task is to generate an automated API testing file using Cucumber and Axios. The generated file should meet the following requirements:
1- Use Cucumber for behavior-driven testing.
2- Use Axios for making HTTP requests.
3- Utilize Chai for assertions.
4- Follow the structure and pattern of the given result.
5- The code should be clean, modular, and reusable.


Expected Result:
The result should be a complete Cucumber step definition file using JavaScript and Axios. It should include:
1- Importing required modules (@cucumber/cucumber, axios, chai).
2- API configuration using Axios.
3- Step definitions for each scenario in the feature file.
4- Chai assertions for validating responses.
5- Use of meaningful variable names and descriptions.
6- Follow the structure and pattern of the given result.

Always start with the following code:

"""
const { When, Then } = require('@cucumber/cucumber');
const axios = require('axios');
const { expect } = require('chai');
const env = process.env;
"""

Here's an example of the expected format:
const { When, Then } = require('@cucumber/cucumber');
const axios = require('axios');
const { expect } = require('chai');
const env = process.env;

let response;

// Configure axios defaults
const api = axios.create({
    baseURL: env.API_URL,
    headers: {
        'Authorization': "Bearer " + env.API_TOKEN
    }
});

// Step to perform a GET request
When('I make a GET request to {string}', async function(url) {
    try {
        response = await api.get(url);
    } catch (err) {
        response = err.response;
    }
});

// Step to perform a POST request with body
When('I make a POST request to {string} with:', async function(url, body) {
    const data = JSON.parse(body);
    try {
        response = await api.post(url, data);
    } catch (err) {
        response = err.response;
    }
});

// Step to check the response status code
Then('the response status code should be {int}', function(statusCode) {
    expect(response.status).to.equal(statusCode);
});

// Step to validate specific fields in the response body
Then('the response should contain {string} with value {string}', function(field, value) {
    expect(response.data[field]).to.equal(value);
});

// Step to validate multiple fields in the response body using a data table
Then('the response should have the following data:', function(dataTable) {
    const expectedData = dataTable.rowsHash();
    Object.keys(expectedData).forEach(key => {
        expect(response.data[key]).to.equal(expectedData[key]);
    });
});

// Step to validate the response contains a specific key
Then('the response should contain the key {string}', function(key) {
    expect(response.data).to.have.property(key);
});      
`