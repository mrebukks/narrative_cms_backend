// brevo.js
// import { BrevoClient } from '@getbrevo/brevo';
require("dotenv").config();
const apiKey = process.env.API_KEY;

const { BrevoClient } = require("@getbrevo/brevo");

// Initialize with your API key from environment variables
const brevo = new BrevoClient({
  apiKey: process.env.API_KEY,
});

module.exports = brevo;
