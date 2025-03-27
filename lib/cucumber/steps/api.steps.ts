import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../world';
import { expect } from 'chai';

// Given steps
Given('I have a valid user ID {string}', async function(this: CustomWorld, id: string) {
  this.userId = id;
});

Given('I have valid user data', async function(this: CustomWorld) {
  this.testData.currentUser = this.testData.validUserData;
});

Given('the API is available', async function(this: CustomWorld) {
  try {
    const response = await this.makeRequest('GET', '/health');
    expect(response.status).to.equal(200);
  } catch (error) {
    throw new Error('API is not available');
  }
});

Given('I am using API version {string}', async function(this: CustomWorld, version: string) {
  // Version is handled in the config, this step is for documentation
  return true;
});

// When steps
When('I send a {word} request to {string}', async function(this: CustomWorld, method: string, path: string) {
  const resolvedPath = path.replace('{id}', this.userId);
  await this.makeRequest(method, resolvedPath);
});

When('I set the user role to {string}', async function(this: CustomWorld, role: string) {
  if (this.testData.currentUser) {
    this.testData.currentUser.role = role;
  }
});

// Then steps
Then('the response status code should be {int}', async function(this: CustomWorld, expectedStatus: number) {
  expect(this.response.status).to.equal(expectedStatus);
});

Then('the response should contain {string}', async function(this: CustomWorld, field: string) {
  const data = await this.response.json();
  expect(data).to.have.property(field);
});

Then('the response field {string} should equal {string}', async function(this: CustomWorld, field: string, value: string) {
  const data = await this.response.json();
  expect(data[field]).to.equal(value);
}); 