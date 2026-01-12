/**
 * Test script to verify Sentry connection
 */

import * as Sentry from '@sentry/node';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually
const envPath = join(__dirname, '.env');
let envContent = '';
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (error) {
  console.error('❌ Could not read .env file:', error.message);
  process.exit(1);
}

// Parse SENTRY_DSN from .env
const sentryMatch = envContent.match(/SENTRY_DSN=(.+)/);
if (!sentryMatch) {
  console.error('❌ SENTRY_DSN not found in .env file');
  process.exit(1);
}

const dsn = sentryMatch[1].trim();
console.log('📋 Found DSN:', dsn.substring(0, 50) + '...');

// Initialize Sentry
console.log('\n🔧 Initializing Sentry...');
try {
  Sentry.init({
    dsn,
    environment: 'development',
    tracesSampleRate: 1.0,
    debug: true,
  });
  console.log('✅ Sentry initialized successfully!\n');
} catch (error) {
  console.error('❌ Failed to initialize Sentry:', error.message);
  process.exit(1);
}

// Test 1: Send a test message
console.log('🧪 Test 1: Sending test message...');
try {
  Sentry.captureMessage('Test message from Neo server - Sentry connection test', 'info');
  console.log('✅ Test message sent successfully');
} catch (error) {
  console.error('❌ Failed to send test message:', error.message);
}

// Test 2: Send a test exception
console.log('\n🧪 Test 2: Sending test exception...');
try {
  const testError = new Error('Test error from Neo server - This is intentional for testing Sentry');
  testError.name = 'SentryTestError';
  Sentry.captureException(testError, {
    tags: {
      test: true,
      source: 'sentry-test-script',
    },
    extra: {
      testInfo: 'This is a test error to verify Sentry is working',
      timestamp: new Date().toISOString(),
    },
  });
  console.log('✅ Test exception sent successfully');
} catch (error) {
  console.error('❌ Failed to send test exception:', error.message);
}

// Wait a moment for Sentry to send
console.log('\n⏳ Waiting for Sentry to send events...');
await new Promise(resolve => setTimeout(resolve, 2000));

// Flush and close
console.log('\n🔄 Flushing Sentry...');
try {
  await Sentry.flush(2000);
  console.log('✅ Sentry flushed successfully');
} catch (error) {
  console.error('❌ Failed to flush Sentry:', error.message);
}

console.log('\n✨ Test complete!');
console.log('\n📊 Next steps:');
console.log('1. Go to https://sentry.io');
console.log('2. Open your project');
console.log('3. Check "Issues" - you should see:');
console.log('   - A test message');
console.log('   - A test exception (SentryTestError)');
console.log('\n✅ If you see both, Sentry is working correctly!');

process.exit(0);
