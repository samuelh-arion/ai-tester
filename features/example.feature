Feature: Example API Tests
  As a user
  I want to test various API endpoints
  So that I can ensure they work correctly

  Scenario: Get user profile
    Given I set header "Authorization" to "Bearer test-token"
    When I send a "GET" request to "/api/users/123"
    Then the response status should be 200
    And the response should contain "id"
    And the response should contain "name"
    And the response header "content-type" should be "application/json"

  Scenario: Create new user
    Given I set header "Content-Type" to "application/json"
    And I set request body to
      """
      {
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user"
      }
      """
    When I send a "POST" request to "/api/users"
    Then the response status should be 201
    And the response should contain "id"
    And the response should match json schema:
      """
      {
        "type": "object",
        "required": ["id", "name", "email", "role"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "email": { "type": "string" },
          "role": { "type": "string" }
        }
      }
      """ 