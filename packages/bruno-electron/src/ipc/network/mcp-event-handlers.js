const { ipcMain } = require('electron');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { cloneDeep, get } = require('lodash');
const { interpolateString } = require('./interpolate-string');
const {
  getEnvVars,
  getTreePathFromCollectionToItem,
  mergeHeaders,
  mergeVars
} = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');

const activeConnections = new Map();

const getConnection = (requestId) => activeConnections.get(requestId);

const sendEvent = (window, eventName, ...args) => {
  if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
    window.webContents.send(eventName, ...args);
  }
};

const prepareMcpRequest = (item, collection, environment, runtimeVariables) => {
  const request = item.draft ? item.draft.request : item.request;
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeVars(collection, request, requestTreePath);
  }

  const envVars = getEnvVars(environment);
  const processEnvVars = getProcessEnvVars(collection.uid);

  const headers = {};
  (request.headers || []).forEach((h) => {
    if (h.enabled) {
      headers[h.name] = interpolateString(h.value, {
        envVars,
        runtimeVariables,
        processEnvVars
      });
    }
  });

  const interpolate = (val) =>
    interpolateString(val || '', { envVars, runtimeVariables, processEnvVars });

  return {
    uid: item.uid,
    transport: request.transport || 'http',
    url: interpolate(request.url),
    command: interpolate(request.command),
    args: interpolate(request.args),
    tool: interpolate(request.tool),
    headers,
    body: request.body,
    vars: request.vars,
    envVars,
    runtimeVariables,
    processEnvVars
  };
};

const createTransport = (preparedRequest) => {
  if (preparedRequest.transport === 'stdio') {
    const cmdParts = preparedRequest.command.trim().split(/\s+/);
    const command = cmdParts[0];

    const argString = preparedRequest.args || '';
    const cmdArgs = argString.length ? argString.trim().split(/\s+/) : [];

    return new StdioClientTransport({
      command,
      args: cmdArgs,
      env: process.env
    });
  }

  const url = new URL(preparedRequest.url);
  return new StreamableHTTPClientTransport(url, {
    requestInit: { headers: preparedRequest.headers }
  });
};

const registerMcpEventHandlers = (window) => {
  ipcMain.handle('renderer:mcp:connect', async (event, { item, collection, environment, runtimeVariables }) => {
    const requestId = item.uid;
    try {
      const existing = getConnection(requestId);
      if (existing) {
        try {
          await existing.client.close();
        } catch (_) {}
        activeConnections.delete(requestId);
      }

      const itemCopy = cloneDeep(item);
      const prepared = prepareMcpRequest(itemCopy, collection, environment, runtimeVariables || {});

      const transport = createTransport(prepared);
      const client = new Client({ name: 'bruno', version: '1.0.0' });

      await client.connect(transport);

      activeConnections.set(requestId, { client, transport, prepared });

      sendEvent(window, 'main:mcp:connected', requestId, collection.uid, {
        transport: prepared.transport,
        url: prepared.url || prepared.command
      });

      return { success: true };
    } catch (error) {
      console.error('MCP connect error:', error);
      sendEvent(window, 'main:mcp:error', requestId, collection?.uid, { error: error.message });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:mcp:list-tools', async (event, requestId) => {
    try {
      const conn = getConnection(requestId);
      if (!conn) {
        return { success: false, error: 'Not connected' };
      }

      const result = await conn.client.listTools();
      return { success: true, tools: result.tools || [] };
    } catch (error) {
      console.error('MCP list-tools error:', error);
      return { success: false, error: error.message, tools: [] };
    }
  });

  ipcMain.handle(
    'renderer:mcp:call-tool',
    async (event, { item, collection, environment, runtimeVariables }) => {
      const requestId = item.uid;
      try {
        const conn = getConnection(requestId);
        if (!conn) {
          return { success: false, error: 'Not connected. Connect to the MCP server first.' };
        }

        const itemCopy = cloneDeep(item);
        const prepared = prepareMcpRequest(itemCopy, collection, environment, runtimeVariables || {});

        const rawBody = prepared.body?.mcp || '{}';
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(rawBody);
        } catch (e) {
          return { success: false, error: `Invalid JSON in request body: ${e.message}` };
        }

        const toolName = prepared.tool;
        if (!toolName) {
          return { success: false, error: 'No tool name specified' };
        }

        const startTime = Date.now();
        const result = await conn.client.callTool({ name: toolName, arguments: toolArgs });
        const duration = Date.now() - startTime;

        sendEvent(window, 'main:mcp:response', requestId, collection.uid, {
          result,
          duration,
          tool: toolName,
          timestamp: Date.now()
        });

        return { success: true, result, duration };
      } catch (error) {
        console.error('MCP call-tool error:', error);
        sendEvent(window, 'main:mcp:error', requestId, collection?.uid, { error: error.message });
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle('renderer:mcp:disconnect', async (event, requestId) => {
    try {
      const conn = getConnection(requestId);
      if (!conn) {
        return { success: true };
      }

      await conn.client.close();
      activeConnections.delete(requestId);

      return { success: true };
    } catch (error) {
      console.error('MCP disconnect error:', error);
      activeConnections.delete(requestId);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:mcp:connection-status', (event, requestId) => {
    const conn = getConnection(requestId);
    return { success: true, status: conn ? 'connected' : 'disconnected' };
  });
};

module.exports = { registerMcpEventHandlers };
