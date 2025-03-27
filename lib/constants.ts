export const VALID_PASSWORD = 'theforge@arionkoder'

export const LLM = {
  MODEL: 'gpt-4o-mini',
  TEMPERATURE: 0,
  PROPERTY_NAME: 'data',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
} as const;

export const FEATURE_GENERATION = {
  SYSTEM_PROMPT: `You are an expert in writing Cucumber/Gherkin feature files for API testing.
Given an API specification, create comprehensive feature files that test the key functionality.
Use clear, descriptive scenarios that cover both happy paths and edge cases.
Follow BDD best practices and use Given/When/Then format appropriately.

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
    And the response should contain "title" with value "Test Title"`,
  TEMPERATURE: 0
} as const;