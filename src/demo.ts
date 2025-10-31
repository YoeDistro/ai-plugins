#!/usr/bin/env node

/**
 * Demo script showing analyze-bitbake-log functionality
 */

import * as fs from 'fs';

// Create a demo log file
const demoLogPath = '/tmp/demo-bitbake.log';
const demoLogContent = `NOTE: Started PRServer with DBfile: /build/cache/prserv.sqlite3, Address: 127.0.0.1:46627
NOTE: Executing Tasks
NOTE: Setscene tasks completed
ERROR: Task do_compile failed for recipe linux-yocto
ERROR: Logfile of failure stored in: /build/tmp/work/core2-64-poky-linux/linux-yocto/5.15.124+git-r0/temp/log.do_compile.12345
ERROR: Task /layers/poky/meta/recipes-kernel/linux/linux-yocto_5.15.bb:do_compile failed with exit code '1'
WARNING: linux-yocto-5.15.124+git-r0 do_compile: QA Issue: Files/directories were installed but not shipped
WARNING: Deprecated variable MACHINE_TASK_PROVIDER detected in layer configuration
ERROR: Unable to fetch source from git://git.yoctoproject.org/linux-yocto.git
ERROR: Fetcher failure: Unable to find revision abc123 in branch master
WARNING: Patch fuzz detected: 0001-fix-build.patch
ERROR: configure failed for recipe example-app
ERROR: See configure.log for more details
NOTE: Tasks Summary: Attempted 2504 tasks of which 2450 didn't need to be rerun
`;

fs.writeFileSync(demoLogPath, demoLogContent);
console.log(`Demo log file created at: ${demoLogPath}\n`);
console.log('Contents:');
console.log('========================================');
console.log(demoLogContent);
console.log('========================================\n');

// Now demonstrate the analysis
console.log('Running analyze-bitbake-log analysis...\n');
console.log('Analysis Result:');
console.log('================\n');

// Manually run similar analysis to show what the tool does
const lines = demoLogContent.split('\n');
const errors = lines.filter(l => l.includes('ERROR:'));
const warnings = lines.filter(l => l.includes('WARNING:'));

console.log(`Found ${errors.length} error(s):\n`);
errors.forEach((err, idx) => {
  console.log(`${idx + 1}. ${err}`);
});

console.log(`\nFound ${warnings.length} warning(s):\n`);
warnings.forEach((warn, idx) => {
  console.log(`${idx + 1}. ${warn}`);
});

console.log('\nTroubleshooting suggestions based on detected errors:');
console.log('- Check network connectivity and source URLs (fetch errors detected)');
console.log('- Verify SRC_URI in the recipe');
console.log('- Check if source repository is accessible');
console.log('- Check for missing dependencies in DEPENDS (compile errors detected)');
console.log('- Review compiler flags and options');
console.log('- Check for missing build dependencies (configure errors detected)');
console.log('- Review configure.log in the work directory');
console.log('- Verify patch files are correct (patch warnings detected)');

console.log('\n✓ Demo completed successfully!');
console.log('\n=== How to use this with Claude ===');
console.log('\n1. Configure Claude Desktop with the MCP server');
console.log('   (see README.md for configuration instructions)');
console.log('\n2. In Claude, simply ask:');
console.log('   "Analyze the BitBake log at /tmp/demo-bitbake.log"');
console.log('\n3. Claude will automatically:');
console.log('   - Call the analyze-bitbake-log tool');
console.log('   - Parse the log file');
console.log('   - Identify errors and warnings');
console.log('   - Provide troubleshooting suggestions');
console.log('   - Explain the issues in natural language');

