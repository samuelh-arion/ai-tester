module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['lib/cucumber/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      ['json:reports/cucumber-report.json', 'html:reports/cucumber-report.html']
    ],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
    worldParameters: {
      env: process.env.NODE_ENV || 'development'
    }
  }
}; 