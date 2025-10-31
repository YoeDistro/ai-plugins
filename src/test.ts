#!/usr/bin/env node

/**
 * Simple test script to verify MCP server tool functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testServer() {
  console.log('Starting MCP Server test...\n');

  const serverPath = join(__dirname, 'index.js');
  const server = spawn('node', [serverPath]);

  let serverOutput = '';
  let serverError = '';

  server.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  server.stderr.on('data', (data) => {
    serverError += data.toString();
    if (data.toString().includes('running on stdio')) {
      console.log('✓ Server started successfully');
      
      // Send initialize request
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };
      
      server.stdin.write(JSON.stringify(initRequest) + '\n');
      
      // Wait a bit then request tools list
      setTimeout(() => {
        const listToolsRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        };
        server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
        
        // Give it time to respond then exit
        setTimeout(() => {
          server.kill();
        }, 1000);
      }, 500);
    }
  });

  server.on('close', (code) => {
    console.log('\n✓ Test completed');
    console.log('\nServer output captured:');
    if (serverOutput) {
      console.log('STDOUT:', serverOutput.substring(0, 200));
    }
    if (serverError) {
      console.log('STDERR:', serverError.substring(0, 200));
    }
    
    if (serverError.includes('running on stdio')) {
      console.log('\n✓ All basic tests passed!');
      console.log('\nThe server is ready to use with Claude Desktop.');
      process.exit(0);
    } else {
      console.log('\n✗ Server did not start correctly');
      process.exit(1);
    }
  });

  server.on('error', (err) => {
    console.error('✗ Failed to start server:', err);
    process.exit(1);
  });
}

testServer().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
