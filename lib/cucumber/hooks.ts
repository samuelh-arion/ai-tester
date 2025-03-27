import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { CustomWorld } from './world';

BeforeAll(async () => {
  // Setup global test environment
  console.log('Starting test suite...');
});

Before(async function(this: CustomWorld) {
  // Reset world state before each scenario
  this.response = null;
  this.userId = '';
  this.headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
});

After(async function(this: CustomWorld) {
  // Cleanup after each scenario
  this.response = null;
  this.userId = '';
});

AfterAll(async () => {
  // Cleanup global resources
  console.log('Test suite completed.');
}); 