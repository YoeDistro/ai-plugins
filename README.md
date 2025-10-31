# Yocto MCP Server - AI Plugins for Yocto Development

AI agent workflows for accelerating Yocto development using Claude and the Model Context Protocol (MCP).

## Overview

This MCP server provides Claude with powerful tools for Yocto/BitBake development workflows, including:

- **Log Analysis**: Parse and troubleshoot BitBake build logs
- **Layer Management**: Query and analyze Yocto layers
- **Recipe Operations**: Search, analyze, and generate recipes
- **Dependency Analysis**: Visualize and understand recipe dependencies
- **Build Status**: Monitor build health and get recommendations

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Yocto build environment

### Install from Source

```bash
git clone https://github.com/YoeDistro/ai-plugins.git
cd ai-plugins
npm install
npm run build
```

### Global Installation

```bash
npm install -g .
```

## Configuration

### Claude Desktop

Add this to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "yocto": {
      "command": "node",
      "args": ["/path/to/ai-plugins/dist/index.js"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "yocto": {
      "command": "yocto-mcp-server"
    }
  }
}
```

After updating the configuration, restart Claude Desktop.

## Available Tools

### 1. analyze-bitbake-log

Analyzes BitBake build logs to identify errors, warnings, and provides troubleshooting suggestions.

**Parameters:**
- `logPath` (required): Path to the BitBake log file
- `errorType` (optional): Filter by error type (e.g., 'compile', 'fetch', 'configure')

**Example usage in Claude:**
```
"Can you analyze the BitBake log at /path/to/build/tmp/log/cooker/console-latest.log?"
```

### 2. layer-info

Gets information about Yocto layers including priorities, dependencies, and recipe counts.

**Parameters:**
- `buildDir` (required): Path to the Yocto build directory
- `layerName` (optional): Specific layer name for detailed information

**Example usage in Claude:**
```
"Show me information about the layers in my build directory at /path/to/build"
```

### 3. recipe-search

Searches for recipes across Yocto layers by name or pattern.

**Parameters:**
- `buildDir` (required): Path to the Yocto build directory
- `recipeName` (required): Recipe name or pattern to search for

**Example usage in Claude:**
```
"Find all recipes related to python in my build at /path/to/build"
```

### 4. dependency-graph

Generates and analyzes dependency information for a specific recipe.

**Parameters:**
- `buildDir` (required): Path to the Yocto build directory
- `recipeName` (required): Name of the recipe to analyze
- `graphType` (optional): Type of dependency graph - 'depends', 'rdepends', or 'both'

**Example usage in Claude:**
```
"What are the dependencies for the linux-yocto recipe in /path/to/build?"
```

### 5. build-status

Checks build status and provides recommendations for common issues.

**Parameters:**
- `buildDir` (required): Path to the Yocto build directory
- `target` (optional): Specific target to check status for

**Example usage in Claude:**
```
"Check the build status of my Yocto build at /path/to/build"
```

### 6. recipe-template

Generates a recipe template for a new package.

**Parameters:**
- `recipeName` (required): Name of the recipe
- `version` (required): Version of the package
- `recipeType` (required): Type of recipe - 'cmake', 'autotools', 'meson', 'makefile', or 'python'
- `homepage` (optional): Homepage URL for the package
- `license` (optional): License (default: MIT)

**Example usage in Claude:**
```
"Generate a cmake recipe template for myapp version 1.0.0"
```

## Usage Examples

Once configured, you can ask Claude natural language questions about your Yocto builds:

1. **Troubleshooting builds:**
   - "My BitBake build failed. Can you analyze the log at /build/tmp/log/cooker/console-latest.log?"
   - "What's causing the compile error in my recipe?"

2. **Understanding your build:**
   - "What layers are configured in my build at /path/to/build?"
   - "Show me all the python recipes in my build"
   - "What are the dependencies for busybox?"

3. **Creating new recipes:**
   - "Generate a CMake recipe template for my application version 2.1"
   - "Create a Python recipe for my-python-package 0.5.0"

4. **Monitoring builds:**
   - "Check the status of my build and tell me if there are any issues"
   - "How much disk space is my build using?"

## Development

### Building

```bash
npm run build
```

### Watch mode

```bash
npm run watch
```

### Testing

To test the server manually:

```bash
# Build the project
npm run build

# Run the server (it uses stdio transport)
node dist/index.js
```

## Architecture

This MCP server is built using:

- **TypeScript**: For type-safe development
- **@modelcontextprotocol/sdk**: Official MCP SDK for building servers
- **Node.js**: Runtime environment

The server implements the Model Context Protocol, which allows Claude to:
1. Discover available tools
2. Execute tools with parameters
3. Receive structured responses

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - See LICENSE file for details

## Related Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Yocto Project Documentation](https://docs.yoctoproject.org/)
- [BitBake User Manual](https://docs.yoctoproject.org/bitbake/)
- [Claude Desktop Documentation](https://claude.ai/desktop)
