#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Helper function to expand BitBake variables in paths
// Note: This is a simple implementation that handles common cases like ${TOPDIR}
// For production use, consider using bitbake's variable expansion if available
function expandPath(layerPath: string, buildDir: string): string {
  // Replace common BitBake variables with absolute paths
  let expanded = layerPath;
  
  // Handle ${TOPDIR} which typically points to the parent of the build directory
  expanded = expanded.replace(/\$\{TOPDIR\}/g, path.dirname(buildDir));
  
  // Handle other common variables if needed
  expanded = expanded.replace(/\$\{BUILDDIR\}/g, buildDir);
  
  return expanded;
}

// Tool definitions for Yocto development
const TOOLS: Tool[] = [
  {
    name: "analyze-bitbake-log",
    description: "Analyze BitBake build logs to identify errors, warnings, and provide troubleshooting suggestions",
    inputSchema: {
      type: "object",
      properties: {
        logPath: {
          type: "string",
          description: "Path to the BitBake log file to analyze",
        },
        errorType: {
          type: "string",
          description: "Optional: Filter by error type (e.g., 'compile', 'fetch', 'configure')",
        },
      },
      required: ["logPath"],
    },
  },
  {
    name: "layer-info",
    description: "Get information about Yocto layers including priorities, dependencies, and recipes",
    inputSchema: {
      type: "object",
      properties: {
        buildDir: {
          type: "string",
          description: "Path to the Yocto build directory",
        },
        layerName: {
          type: "string",
          description: "Optional: Specific layer name to get detailed information about",
        },
      },
      required: ["buildDir"],
    },
  },
  {
    name: "recipe-search",
    description: "Search for recipes across Yocto layers by name or pattern",
    inputSchema: {
      type: "object",
      properties: {
        buildDir: {
          type: "string",
          description: "Path to the Yocto build directory",
        },
        recipeName: {
          type: "string",
          description: "Recipe name or pattern to search for",
        },
      },
      required: ["buildDir", "recipeName"],
    },
  },
  {
    name: "dependency-graph",
    description: "Generate and analyze dependency information for a specific recipe",
    inputSchema: {
      type: "object",
      properties: {
        buildDir: {
          type: "string",
          description: "Path to the Yocto build directory",
        },
        recipeName: {
          type: "string",
          description: "Name of the recipe to analyze dependencies for",
        },
        graphType: {
          type: "string",
          description: "Type of dependency graph: 'depends', 'rdepends', or 'both'",
          enum: ["depends", "rdepends", "both"],
        },
      },
      required: ["buildDir", "recipeName"],
    },
  },
  {
    name: "build-status",
    description: "Check build status and provide recommendations for common issues",
    inputSchema: {
      type: "object",
      properties: {
        buildDir: {
          type: "string",
          description: "Path to the Yocto build directory",
        },
        target: {
          type: "string",
          description: "Optional: Specific target to check status for",
        },
      },
      required: ["buildDir"],
    },
  },
  {
    name: "recipe-template",
    description: "Generate a recipe template for a new package",
    inputSchema: {
      type: "object",
      properties: {
        recipeName: {
          type: "string",
          description: "Name of the recipe (e.g., 'myapp')",
        },
        version: {
          type: "string",
          description: "Version of the package",
        },
        recipeType: {
          type: "string",
          description: "Type of recipe: 'cmake', 'autotools', 'meson', 'makefile', or 'python'",
          enum: ["cmake", "autotools", "meson", "makefile", "python"],
        },
        homepage: {
          type: "string",
          description: "Optional: Homepage URL for the package",
        },
        license: {
          type: "string",
          description: "Optional: License (default: MIT)",
        },
      },
      required: ["recipeName", "version", "recipeType"],
    },
  },
];

// Helper function to execute shell commands safely
function executeCommand(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error: any) {
    return `Error executing command: ${error.message}\n${error.stderr || ""}`;
  }
}

// Tool handlers
async function handleAnalyzeBitbakeLog(args: any): Promise<string> {
  const { logPath, errorType } = args;

  if (!fs.existsSync(logPath)) {
    return `Error: Log file not found at ${logPath}`;
  }

  const logContent = fs.readFileSync(logPath, "utf-8");
  const lines = logContent.split("\n");

  const errors: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  // Parse log for errors and warnings
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes("ERROR:") || line.match(/error:/i)) {
      errors.push(line);
    } else if (line.includes("WARNING:") || line.match(/warning:/i)) {
      warnings.push(line);
    } else if (line.includes("NOTE:")) {
      notes.push(line);
    }
  }

  let result = "=== BitBake Log Analysis ===\n\n";
  
  if (errors.length > 0) {
    result += `Found ${errors.length} error(s):\n`;
    errors.slice(0, 10).forEach((err, idx) => {
      result += `${idx + 1}. ${err}\n`;
    });
    if (errors.length > 10) {
      result += `... and ${errors.length - 10} more errors\n`;
    }
    result += "\n";

    // Provide troubleshooting suggestions
    result += "Common troubleshooting steps:\n";
    if (errors.some(e => e.includes("fetch") || e.includes("Fetcher"))) {
      result += "- Check network connectivity and source URLs\n";
      result += "- Verify SRC_URI in the recipe\n";
      result += "- Check if source repository is accessible\n";
    }
    if (errors.some(e => e.includes("configure") || e.includes("Configure"))) {
      result += "- Check for missing dependencies in DEPENDS\n";
      result += "- Review configure.log in the work directory\n";
      result += "- Verify PACKAGECONFIG options\n";
    }
    if (errors.some(e => e.includes("compile") || e.includes("make"))) {
      result += "- Check for missing build dependencies\n";
      result += "- Review compiler flags and options\n";
      result += "- Check if source is compatible with the toolchain\n";
    }
    if (errors.some(e => e.includes("patch"))) {
      result += "- Verify patch files are correct and not corrupted\n";
      result += "- Check if patches apply to the correct source version\n";
      result += "- Review patch fuzz and offset warnings\n";
    }
  }

  if (warnings.length > 0) {
    result += `\nFound ${warnings.length} warning(s):\n`;
    warnings.slice(0, 5).forEach((warn, idx) => {
      result += `${idx + 1}. ${warn}\n`;
    });
    if (warnings.length > 5) {
      result += `... and ${warnings.length - 5} more warnings\n`;
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    result += "No errors or warnings found in the log.\n";
    result += `Log contains ${notes.length} informational notes.\n`;
  }

  return result;
}

async function handleLayerInfo(args: any): Promise<string> {
  const { buildDir, layerName } = args;

  if (!fs.existsSync(buildDir)) {
    return `Error: Build directory not found at ${buildDir}`;
  }

  const bblayersConf = path.join(buildDir, "conf", "bblayers.conf");
  if (!fs.existsSync(bblayersConf)) {
    return `Error: bblayers.conf not found at ${bblayersConf}. Is this a valid Yocto build directory?`;
  }

  let result = "=== Yocto Layer Information ===\n\n";

  // Read bblayers.conf to get layer paths
  const bblayersContent = fs.readFileSync(bblayersConf, "utf-8");
  const layerMatches = bblayersContent.match(/BBLAYERS \?= "([^"]*)"/);
  
  if (!layerMatches) {
    return "Error: Could not parse BBLAYERS from bblayers.conf";
  }

  const layerPaths = layerMatches[1].split(/\s+/).filter(p => p.length > 0);
  result += `Found ${layerPaths.length} layers:\n\n`;

  for (const layerPath of layerPaths) {
    const expandedPath = expandPath(layerPath, buildDir);
    const confLayerPath = path.join(expandedPath, "conf", "layer.conf");
    
    if (fs.existsSync(confLayerPath)) {
      const layerConfContent = fs.readFileSync(confLayerPath, "utf-8");
      const layerNameMatch = layerConfContent.match(/BBFILE_COLLECTIONS \+= "([^"]+)"/);
      const priorityMatch = layerConfContent.match(/BBFILE_PRIORITY_[^\s]+ = "([^"]+)"/);
      
      const currentLayerName = layerNameMatch ? layerNameMatch[1] : path.basename(expandedPath);
      
      if (!layerName || currentLayerName === layerName) {
        result += `Layer: ${currentLayerName}\n`;
        result += `  Path: ${expandedPath}\n`;
        if (priorityMatch) {
          result += `  Priority: ${priorityMatch[1]}\n`;
        }
        
        // Count recipes
        try {
          const recipeCount = executeCommand(`find ${expandedPath} -name "*.bb" 2>/dev/null | wc -l`).trim();
          result += `  Recipes: ${recipeCount}\n`;
        } catch (e) {
          result += `  Recipes: Unable to count\n`;
        }
        
        result += "\n";
      }
    }
  }

  return result;
}

async function handleRecipeSearch(args: any): Promise<string> {
  const { buildDir, recipeName } = args;

  if (!fs.existsSync(buildDir)) {
    return `Error: Build directory not found at ${buildDir}`;
  }

  // Initialize bitbake environment and search
  const searchCmd = `cd ${buildDir} && bitbake-layers show-recipes "${recipeName}*" 2>&1`;
  const output = executeCommand(searchCmd);

  if (output.includes("Error") || output.includes("error")) {
    // Fallback to file search
    const bblayersConf = path.join(buildDir, "conf", "bblayers.conf");
    if (!fs.existsSync(bblayersConf)) {
      return `Error: Could not search recipes. Build directory may not be properly initialized.`;
    }

    const bblayersContent = fs.readFileSync(bblayersConf, "utf-8");
    const layerMatches = bblayersContent.match(/BBLAYERS \?= "([^"]*)"/);
    
    if (!layerMatches) {
      return "Error: Could not parse BBLAYERS from bblayers.conf";
    }

    const layerPaths = layerMatches[1].split(/\s+/).filter(p => p.length > 0);
    const results: string[] = [];

    for (const layerPath of layerPaths) {
      const expandedPath = expandPath(layerPath, buildDir);
      const findCmd = `find ${expandedPath} -name "${recipeName}*.bb" 2>/dev/null`;
      const found = executeCommand(findCmd).trim();
      
      if (found) {
        found.split("\n").forEach(f => {
          if (f) results.push(f);
        });
      }
    }

    if (results.length === 0) {
      return `No recipes found matching "${recipeName}"`;
    }

    let result = `=== Recipe Search Results ===\n\n`;
    result += `Found ${results.length} recipe(s) matching "${recipeName}":\n\n`;
    
    results.forEach((recipePath, idx) => {
      const recipeFile = path.basename(recipePath);
      const recipeDir = path.dirname(recipePath);
      result += `${idx + 1}. ${recipeFile}\n`;
      result += `   Path: ${recipePath}\n`;
      result += `   Layer: ${recipeDir.split("/").slice(-3, -1).join("/")}\n\n`;
    });

    return result;
  }

  return `=== Recipe Search Results ===\n\n${output}`;
}

async function handleDependencyGraph(args: any): Promise<string> {
  const { buildDir, recipeName, graphType = "depends" } = args;

  if (!fs.existsSync(buildDir)) {
    return `Error: Build directory not found at ${buildDir}`;
  }

  let result = `=== Dependency Analysis for ${recipeName} ===\n\n`;

  // Get build dependencies
  if (graphType === "depends" || graphType === "both") {
    const dependsCmd = `cd ${buildDir} && bitbake -g ${recipeName} 2>&1`;
    const output = executeCommand(dependsCmd);
    
    if (output.includes("Error") || output.includes("error")) {
      result += `Error getting dependencies: ${output}\n`;
    } else {
      // Parse task-depends.dot if it exists
      const taskDependsPath = path.join(buildDir, "task-depends.dot");
      if (fs.existsSync(taskDependsPath)) {
        const dotContent = fs.readFileSync(taskDependsPath, "utf-8");
        const lines = dotContent.split("\n");
        
        result += "Build Dependencies (DEPENDS):\n";
        const deps = new Set<string>();
        
        for (const line of lines) {
          const match = line.match(/"([^"]+)" -> "([^"]+)"/);
          if (match && match[1].includes(recipeName)) {
            deps.add(match[2].split(".")[0]);
          }
        }
        
        Array.from(deps).slice(0, 20).forEach(dep => {
          result += `  - ${dep}\n`;
        });
        
        if (deps.size > 20) {
          result += `  ... and ${deps.size - 20} more dependencies\n`;
        }
        result += "\n";
      }
    }
  }

  // Get runtime dependencies
  if (graphType === "rdepends" || graphType === "both") {
    // First generate the dependency graph
    const generateCmd = `cd ${buildDir} && bitbake -g ${recipeName}`;
    executeCommand(generateCmd);
    
    // Then read and parse the pn-depends.dot file
    const pnDependsPath = path.join(buildDir, "pn-depends.dot");
    if (fs.existsSync(pnDependsPath)) {
      const pnContent = fs.readFileSync(pnDependsPath, "utf-8");
      const lines = pnContent.split("\n").filter(l => l.includes("rdepends")).slice(0, 20);
      
      result += "Runtime Dependencies (RDEPENDS):\n";
      if (lines.length > 0) {
        lines.forEach(line => {
          result += `  ${line.trim()}\n`;
        });
      } else {
        result += "  No runtime dependencies found\n";
      }
      result += "\n";
    } else {
      result += "Runtime Dependencies: Unable to generate pn-depends.dot\n\n";
    }
  }

  return result;
}

async function handleBuildStatus(args: any): Promise<string> {
  const { buildDir, target } = args;

  if (!fs.existsSync(buildDir)) {
    return `Error: Build directory not found at ${buildDir}`;
  }

  let result = "=== Build Status Check ===\n\n";

  // Check if build directory is initialized
  const localConf = path.join(buildDir, "conf", "local.conf");
  const bblayersConf = path.join(buildDir, "conf", "bblayers.conf");

  if (!fs.existsSync(localConf) || !fs.existsSync(bblayersConf)) {
    result += "⚠️  Build directory not properly initialized\n";
    result += "Run 'source oe-init-build-env' to initialize\n";
    return result;
  }

  result += "✓ Build directory is initialized\n\n";

  // Check disk space
  const dfOutput = executeCommand(`df -h ${buildDir} | tail -1`);
  const diskUsage = dfOutput.match(/(\d+)%/);
  if (diskUsage) {
    const usage = parseInt(diskUsage[1]);
    result += `Disk Usage: ${usage}%\n`;
    if (usage > 90) {
      result += "⚠️  WARNING: Low disk space! Consider cleaning tmp directory\n";
      result += "   Run: bitbake -c cleanall <recipe>\n";
    }
  }

  // Check sstate cache
  const sstatePath = path.join(buildDir, "sstate-cache");
  if (fs.existsSync(sstatePath)) {
    const sstateSizeCmd = `du -sh ${sstatePath} 2>/dev/null | cut -f1`;
    const sstateSize = executeCommand(sstateSizeCmd).trim();
    result += `Shared State Cache: ${sstateSize}\n`;
  }

  // Check tmp directory
  const tmpPath = path.join(buildDir, "tmp");
  if (fs.existsSync(tmpPath)) {
    const tmpSizeCmd = `du -sh ${tmpPath} 2>/dev/null | cut -f1`;
    const tmpSize = executeCommand(tmpSizeCmd).trim();
    result += `Build Temp Directory: ${tmpSize}\n`;
  }

  result += "\n";

  // Check for recent build logs
  const logDir = path.join(buildDir, "tmp", "log", "cooker");
  if (fs.existsSync(logDir)) {
    const recentLogs = executeCommand(`ls -lt ${logDir} 2>/dev/null | head -5`);
    if (recentLogs) {
      result += "Recent build logs:\n";
      result += recentLogs + "\n";
    }
  }

  // Provide recommendations
  result += "\nRecommendations:\n";
  result += "- Use 'bitbake -g <target>' to visualize dependencies\n";
  result += "- Run 'bitbake -e <recipe>' to see recipe environment\n";
  result += "- Check 'bitbake-layers show-layers' for layer configuration\n";
  result += "- Use 'bitbake-layers show-recipes' to list available recipes\n";

  if (target) {
    result += `\nTo build target '${target}', run:\n`;
    result += `  bitbake ${target}\n`;
  }

  return result;
}

async function handleRecipeTemplate(args: any): Promise<string> {
  const { recipeName, version, recipeType, homepage = "", license = "MIT" } = args;

  let template = `# Recipe for ${recipeName}\n`;
  template += `SUMMARY = "Summary of ${recipeName}"\n`;
  template += `DESCRIPTION = "Detailed description of ${recipeName}"\n`;
  
  if (homepage) {
    template += `HOMEPAGE = "${homepage}"\n`;
  }
  
  template += `LICENSE = "${license}"\n`;
  // Note: Replace XXXXXXXX... with actual MD5 checksum of the LICENSE file
  // Calculate using: md5sum LICENSE | cut -d' ' -f1
  template += `LIC_FILES_CHKSUM = "file://LICENSE;md5=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"\n\n`;

  template += `SRC_URI = "https://example.com/${recipeName}-\${PV}.tar.gz"\n`;
  // Note: Replace XXXXXXXX... with actual SHA256 checksum of the source archive
  // Calculate using: sha256sum source.tar.gz | cut -d' ' -f1
  template += `SRC_URI[sha256sum] = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"\n\n`;

  template += `S = "\${WORKDIR}/${recipeName}-\${PV}"\n\n`;

  // Add recipe-type specific content
  switch (recipeType) {
    case "cmake":
      template += `inherit cmake\n\n`;
      template += `DEPENDS += "cmake-native"\n\n`;
      template += `EXTRA_OECMAKE += "\\\n`;
      template += `    -DCMAKE_BUILD_TYPE=Release \\\n`;
      template += `"\n\n`;
      break;

    case "autotools":
      template += `inherit autotools\n\n`;
      template += `DEPENDS += "autoconf-native automake-native libtool-native"\n\n`;
      template += `EXTRA_OECONF += "\\\n`;
      template += `    --enable-shared \\\n`;
      template += `    --disable-static \\\n`;
      template += `"\n\n`;
      break;

    case "meson":
      template += `inherit meson\n\n`;
      template += `DEPENDS += "meson-native ninja-native"\n\n`;
      template += `EXTRA_OEMESON += "\\\n`;
      template += `    -Dbuildtype=release \\\n`;
      template += `"\n\n`;
      break;

    case "makefile":
      template += `# Custom Makefile recipe\n\n`;
      template += `do_compile() {\n`;
      template += `    oe_runmake\n`;
      template += `}\n\n`;
      template += `do_install() {\n`;
      template += `    oe_runmake install DESTDIR=\${D}\n`;
      template += `}\n\n`;
      break;

    case "python":
      template += `inherit setuptools3\n\n`;
      template += `DEPENDS += "python3-native python3-setuptools-native"\n`;
      template += `RDEPENDS:\${PN} += "python3-core"\n\n`;
      break;
  }

  template += `# Additional configuration\n`;
  template += `# PACKAGECONFIG ??= "\${@bb.utils.filter('DISTRO_FEATURES', 'systemd', d)}"\n`;
  template += `# PACKAGECONFIG[systemd] = "--with-systemd,--without-systemd,systemd"\n\n`;

  const fileName = `${recipeName}_${version}.bb`;
  
  let result = `=== Generated Recipe Template ===\n\n`;
  result += `Save this as: ${fileName}\n\n`;
  result += `--- Content ---\n`;
  result += template;
  result += `--- End of Content ---\n\n`;
  result += `Next steps:\n`;
  result += `1. Update the SRC_URI with the actual source URL\n`;
  result += `2. Calculate and update sha256sum checksum\n`;
  result += `3. Update LICENSE checksum from actual LICENSE file\n`;
  result += `4. Adjust DEPENDS and RDEPENDS as needed\n`;
  result += `5. Test the recipe with 'bitbake ${recipeName}'\n`;

  return result;
}

// Main server setup
const server = new Server(
  {
    name: "yocto-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze-bitbake-log":
        return {
          content: [
            {
              type: "text",
              text: await handleAnalyzeBitbakeLog(args || {}),
            },
          ],
        };

      case "layer-info":
        return {
          content: [
            {
              type: "text",
              text: await handleLayerInfo(args || {}),
            },
          ],
        };

      case "recipe-search":
        return {
          content: [
            {
              type: "text",
              text: await handleRecipeSearch(args || {}),
            },
          ],
        };

      case "dependency-graph":
        return {
          content: [
            {
              type: "text",
              text: await handleDependencyGraph(args || {}),
            },
          ],
        };

      case "build-status":
        return {
          content: [
            {
              type: "text",
              text: await handleBuildStatus(args || {}),
            },
          ],
        };

      case "recipe-template":
        return {
          content: [
            {
              type: "text",
              text: await handleRecipeTemplate(args || {}),
            },
          ],
        };

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Yocto MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
