# MySQL Read-Only Database Access Server

[![smithery badge](https://smithery.ai/badge/@liuwenkai01/mcp-mysql-readonly)](https://smithery.ai/server/@liuwenkai01/mcp-mysql-readonly)


## Overview

The MySQL Read-Only Database Access Server is designed to provide read-only access to specific MySQL databases for large language models (LLMs) via the Model Context Protocol (MCP). 

## Features

- Read-only access: Ensures data integrity by preventing modifications.
- User-friendly: Easy to set up and configure.
- Secure: Supports secure connections to databases.

## Installing

### Installing via Smithery

To install MySQL Read-Only Database Access Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@liuwenkai01/mcp-mysql-readonly):

```bash
npx -y @smithery/cli install @liuwenkai01/mcp-mysql-readonly --client claude
```

## Configuration

To configure the server, you will need to update the `.env` file with the appropriate database credentials. 

## Usage

Once configured, the server can be started with the following command:

```bash
node server.js
```

## Acknowledgments

Special thanks to contributors and supporters.

## License

This project is licensed under the MIT License.
