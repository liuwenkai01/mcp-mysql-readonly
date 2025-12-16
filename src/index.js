#!/usr/bin/env node

const mysql = require('mysql2/promise');

let connection = null;
const isReadOnly = process.env.MYSQL_READONLY === 'true';
const logToStderr = process.env.MCP_LOG_TO_STDERR === 'true';

// 日志函数 - 根据 MCP_LOG_TO_STDERR 环境变量决定是否输出日志
function log(...args) {
  if (logToStderr) {
    console.error(...args);
  }
}

// 自动连接数据库
async function autoConnect() {
  try {
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'test'
    };

    log(`🔌 Connecting to MySQL: ${config.host}:${config.port}/${config.database}`);
    log(`🔒 Read-only mode: ${isReadOnly ? 'ENABLED' : 'DISABLED'}`);
    connection = await mysql.createConnection(config);
    log('✅ MySQL connected successfully');
    return true;
  } catch (error) {
    log('❌ MySQL connection failed:', error.message);
    return false;
  }
}

// 检查SQL是否为只读操作
function isReadOnlySQL(sql) {
  const trimmedSQL = sql.trim().toUpperCase();
  const readOnlyCommands = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'WITH'];
  return readOnlyCommands.some(cmd => trimmedSQL.startsWith(cmd));
}

// 检查SQL是否为写操作
function isWriteSQL(sql) {
  const trimmedSQL = sql.trim().toUpperCase();
  const writeCommands = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'REPLACE'];
  return writeCommands.some(cmd => trimmedSQL.startsWith(cmd));
}

// 工具定义
const tools = {
  connect_db: {
    description: "Connect to a MySQL database",
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", description: "Database host" },
        port: { type: "string", description: "Database port" },
        user: { type: "string", description: "Database user" },
        password: { type: "string", description: "Database password" },
        database: { type: "string", description: "Database name" }
      },
      required: ["host", "user", "password", "database"]
    }
  },
  
  query: {
    description: `Execute a SQL query${isReadOnly ? ' (READ-ONLY mode: only SELECT, SHOW, DESCRIBE commands allowed)' : ''}`,
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "SQL query to execute" }
      },
      required: ["sql"]
    }
  },
  
  list_tables: {
    description: "List all tables in the current database",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  
  describe_table: {
    description: "Describe the structure of a table",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name to describe" }
      },
      required: ["table"]
    }
  }
};

// 只有在非只读模式下才添加写操作工具
if (!isReadOnly) {
  tools.execute = {
    description: "Execute a SQL statement (INSERT, UPDATE, DELETE) - Available only in write mode",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "SQL statement to execute" }
      },
      required: ["sql"]
    }
  };
}

// 工具处理器
const handlers = {
  connect_db: async (params) => {
    try {
      if (connection) {
        await connection.end();
      }
      
      connection = await mysql.createConnection({
        host: params.host,
        port: parseInt(params.port || '3306', 10),
        user: params.user,
        password: params.password,
        database: params.database
      });
      
      return { 
        content: [{ 
          type: "text", 
          text: `Successfully connected to MySQL database: ${params.database}@${params.host}:${params.port || 3306}\nRead-only mode: ${isReadOnly ? 'ENABLED' : 'DISABLED'}` 
        }] 
      };
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  },
  
  query: async (params) => {
    if (!connection) {
      throw new Error("Database not connected. Please connect first.");
    }
    
    // 在只读模式下检查SQL类型
    if (isReadOnly && !isReadOnlySQL(params.sql)) {
      throw new Error(`❌ READ-ONLY MODE: Only SELECT, SHOW, DESCRIBE, EXPLAIN commands are allowed. Attempted: ${params.sql.trim().split(' ')[0].toUpperCase()}`);
    }
    
    try {
      const [rows] = await connection.execute(params.sql);
      const resultText = Array.isArray(rows) && rows.length > 0 
        ? JSON.stringify(rows, null, 2)
        : `Query executed successfully. ${rows.affectedRows !== undefined ? `Affected rows: ${rows.affectedRows}` : 'No results returned.'}`;
      
      return { 
        content: [{ 
          type: "text", 
          text: `${isReadOnly ? '🔒 [READ-ONLY] ' : ''}${resultText}` 
        }] 
      };
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  },
  
  list_tables: async () => {
    if (!connection) {
      throw new Error("Database not connected. Please connect first.");
    }
    
    try {
      const [rows] = await connection.query("SHOW TABLES");
      const tableNames = rows.map(row => Object.values(row)[0]);
      return { 
        content: [{ 
          type: "text", 
          text: `${isReadOnly ? '🔒 [READ-ONLY] ' : ''}Tables in database:\n${tableNames.map(name => `- ${name}`).join('\n')}` 
        }] 
      };
    } catch (error) {
      throw new Error(`Failed to list tables: ${error.message}`);
    }
  },
  
  describe_table: async (params) => {
    if (!connection) {
      throw new Error("Database not connected. Please connect first.");
    }
    
    try {
      const [rows] = await connection.query(`DESCRIBE ${params.table}`);
      return { 
        content: [{ 
          type: "text", 
          text: `${isReadOnly ? '🔒 [READ-ONLY] ' : ''}Table structure for ${params.table}:\n${JSON.stringify(rows, null, 2)}` 
        }] 
      };
    } catch (error) {
      throw new Error(`Failed to describe table: ${error.message}`);
    }
  }
};

// 只有在非只读模式下才添加execute处理器
if (!isReadOnly) {
  handlers.execute = async (params) => {
    if (!connection) {
      throw new Error("Database not connected. Please connect first.");
    }
    
    try {
      const [result] = await connection.execute(params.sql);
      return { 
        content: [{ 
          type: "text", 
          text: `✅ Query executed successfully. Affected rows: ${result.affectedRows || 0}` 
        }] 
      };
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`);
    }
  };
}

// MCP 协议处理 - 使用 readline 逐行处理，立即响应
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

rl.on('line', async (line) => {
  if (line.trim()) {
    await handleMessage(line.trim());
  }
});

async function handleMessage(line) {
  try {
    const message = JSON.parse(line);
    
    switch (message.method) {
      case 'initialize':
        sendResponse(message.id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "mysql-mcp-server",
            version: "1.0.0"
          }
        });
        break;

      case 'notifications/initialized':
        // 客户端确认初始化完成，不需要响应
        break;

      case 'tools/list':
        sendResponse(message.id, {
          tools: Object.entries(tools).map(([name, tool]) => ({
            name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        });
        break;
        
      case 'tools/call':
        const toolName = message.params.name;
        const handler = handlers[toolName];
        
        if (!handler) {
          sendError(message.id, -32601, `Tool not found: ${toolName}`);
          return;
        }
        
        try {
          const result = await handler(message.params.arguments || {});
          sendResponse(message.id, result);
        } catch (error) {
          sendError(message.id, -32000, error.message);
        }
        break;
        
      default:
        sendError(message.id, -32601, `Unknown method: ${message.method}`);
    }
  } catch (error) {
    log('Error handling message:', error);
    sendError(null, -32700, 'Parse error');
  }
}

function sendResponse(id, result) {
  const response = {
    jsonrpc: "2.0",
    id,
    result
  };
  const data = JSON.stringify(response) + '\n';
  process.stdout.write(data, () => {
    // 确保数据被刷新
  });
}

function sendError(id, code, message) {
  const response = {
    jsonrpc: "2.0",
    id,
    error: { code, message }
  };
  const data = JSON.stringify(response) + '\n';
  process.stdout.write(data, () => {
    // 确保数据被刷新
  });
}

// 启动时自动连接
autoConnect().then(() => {
  log('🚀 MySQL MCP Server started and ready');
}).catch(() => {
  log('⚠️  MySQL MCP Server started but database connection failed');
});
