# Yocto MCP Server Test Examples

This document provides example scenarios for testing the Yocto MCP Server tools.

## Test Scenarios

### 1. Testing analyze-bitbake-log

Create a sample log file:

```bash
cat > /tmp/test-bitbake.log << 'EOF'
NOTE: Started PRServer with DBfile...
NOTE: Executing Tasks
ERROR: Task failed: do_compile
ERROR: Logfile of failure stored in: /path/to/workdir/temp/log.do_compile
ERROR: Task /path/to/recipe.bb:do_compile failed
WARNING: Deprecated variable usage detected
NOTE: Tasks Summary: Attempted 100 tasks of which 90 didn't need to be rerun
EOF
```

Then in Claude:
```
"Analyze the BitBake log at /tmp/test-bitbake.log"
```

### 2. Testing recipe-template

In Claude, ask:
```
"Generate a CMake recipe template for myapp version 1.0.0 with MIT license"
```

Expected output: A complete .bb recipe file template

### 3. Testing layer-info

Requires a real Yocto build directory. If you have one:
```
"Show me the layers configured in /path/to/your/build"
```

### 4. Testing recipe-search

Requires a real Yocto build directory:
```
"Search for python recipes in /path/to/your/build"
```

### 5. Testing build-status

Requires a real Yocto build directory:
```
"Check the build status at /path/to/your/build"
```

### 6. Testing dependency-graph

Requires a real Yocto build directory:
```
"Show me the dependencies for busybox in /path/to/your/build"
```

## Manual Testing with MCP Inspector

You can use the MCP Inspector tool to test the server directly:

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector node dist/index.js
```

This will open a web interface where you can:
1. See all available tools
2. Test each tool with custom parameters
3. View the responses

## Integration Testing

To test with Claude Desktop:

1. Configure Claude Desktop as described in README.md
2. Restart Claude Desktop
3. Start a new conversation
4. Ask Claude about the available Yocto tools: "What Yocto development tools do you have?"
5. Test individual tools with the examples above

## Expected Behavior

Each tool should:
- Return structured text responses
- Handle errors gracefully (e.g., missing files, invalid paths)
- Provide helpful error messages
- Include troubleshooting guidance where applicable

## Notes

- Most tools require an actual Yocto build environment to test fully
- The analyze-bitbake-log and recipe-template tools can be tested without a full Yocto setup
- For full integration testing, use a real Yocto build directory from a project like poky
