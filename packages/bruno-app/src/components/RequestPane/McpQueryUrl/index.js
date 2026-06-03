import { IconDeviceFloppy, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import SendButton from 'components/RequestPane/SendButton';
import classnames from 'classnames';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { updateMcpRequestField, updateRequestBody } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import { mcpConnect, mcpDisconnect, mcpListTools, getMcpConnectionStatus } from 'utils/network/index';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';
import StyledWrapper from './StyledWrapper';

const generateFromSchema = (schema) => {
  if (!schema || typeof schema !== 'object') return {};

  const generate = (node) => {
    if (!node || typeof node !== 'object') return null;

    switch (node.type) {
      case 'object': {
        const result = {};
        const props = node.properties || {};
        const required = new Set(node.required || []);
        for (const [key, val] of Object.entries(props)) {
          // Include required props always; include optional props with a comment-style default
          if (required.has(key) || Object.keys(props).length <= 6) {
            result[key] = generate(val);
          }
        }
        return result;
      }
      case 'array':
        return node.items ? [generate(node.items)] : [];
      case 'string':
        return node.enum ? node.enum[0] : (node.default !== undefined ? node.default : '');
      case 'number':
      case 'integer':
        return node.default !== undefined ? node.default : 0;
      case 'boolean':
        return node.default !== undefined ? node.default : false;
      case 'null':
        return null;
      default:
        if (Array.isArray(node.type)) {
          // Use first non-null type
          const t = node.type.find((t) => t !== 'null');
          return generate({ ...node, type: t });
        }
        return node.default !== undefined ? node.default : null;
    }
  };

  return generate(schema);
};

const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

const useMcpConnectionStatus = (requestId) => {
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  useEffect(() => {
    const check = async () => {
      const result = await getMcpConnectionStatus(requestId);
      setConnectionStatus(result?.status ?? CONNECTION_STATUS.DISCONNECTED);
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [requestId]);
  return [connectionStatus, setConnectionStatus];
};

const McpQueryUrl = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const { theme, displayedTheme } = useTheme();
  const saveShortcut = isMacOS() ? '⌘S' : 'Ctrl+S';
  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const [connectionStatus, setConnectionStatus] = useMcpConnectionStatus(item.uid);
  const [availableTools, setAvailableTools] = useState([]);

  const request = getPropertyFromDraftOrRequest(item, 'request');
  const url = item.draft ? (item.draft.request?.url || '') : (item.request?.url || '');
  const tool = request?.tool || '';
  const transport = request?.transport || 'http';

  const setTool = (toolName, tools = availableTools) => {
    dispatch(updateMcpRequestField({
      itemUid: item.uid,
      collectionUid: collection.uid,
      field: 'tool',
      value: toolName
    }));

    // Populate params from the tool's input schema
    const toolDef = tools.find((t) => t.name === toolName);
    if (toolDef?.inputSchema) {
      const template = generateFromSchema(toolDef.inputSchema);
      const hasProperties = toolDef.inputSchema.properties
        && Object.keys(toolDef.inputSchema.properties).length > 0;
      if (hasProperties) {
        dispatch(updateRequestBody({
          content: JSON.stringify(template, null, 2),
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      }
    }
  };

  const handleConnect = async () => {
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const result = await mcpConnect(
        item.draft ? { ...item, request: item.draft.request } : item,
        collection,
        null,
        collection.runtimeVariables || {}
      );

      if (result && !result.success) {
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
        toast.error(`Connection failed: ${result.error}`);
        return;
      }

      setConnectionStatus(CONNECTION_STATUS.CONNECTED);

      // Automatically list tools after connecting
      const toolsResult = await mcpListTools(item.uid);
      if (toolsResult?.success && toolsResult.tools?.length) {
        setAvailableTools(toolsResult.tools);
        toast.success(`Connected — ${toolsResult.tools.length} tool${toolsResult.tools.length !== 1 ? 's' : ''} available`);
        // Auto-select the first tool if none is set, passing fresh tools list
        if (!tool && toolsResult.tools.length > 0) {
          setTool(toolsResult.tools[0].name, toolsResult.tools);
        }
      } else {
        setAvailableTools([]);
        toast.success('Connected to MCP server');
      }
    } catch (err) {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      toast.error(`Connection failed: ${err.message}`);
    }
  };

  const handleDisconnect = async (e, notify) => {
    e && e.stopPropagation();
    try {
      await mcpDisconnect(item.uid);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      setAvailableTools([]);
      notify && toast.success('MCP connection closed');
    } catch (err) {
      console.error('Failed to close MCP connection:', err);
      notify && toast.error('Failed to close MCP connection');
    }
  };

  const handleRunClick = async (e) => {
    e.stopPropagation();
    if (!tool) {
      toast.error('Please select or enter a tool name');
      return;
    }
    handleRun(e);
  };

  const onSave = () => {
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const handleUrlChange = (value) => {
    const field = transport === 'stdio' ? 'command' : 'url';
    dispatch(updateMcpRequestField({
      itemUid: item.uid,
      collectionUid: collection.uid,
      field,
      value: value?.trim() ?? value
    }));
  };

  return (
    <StyledWrapper>
      <div className="flex items-center h-full">
        <div className="flex items-center input-container flex-1 min-w-0 h-full relative">
          <div className="flex items-center justify-center px-[10px]">
            <span className="method-mcp">MCP</span>
          </div>
          <SingleLineEditor
            value={transport === 'http' ? url : (request?.command || '')}
            onSave={onSave}
            onChange={handleUrlChange}
            placeholder={transport === 'http' ? 'http://localhost:3000/mcp' : 'command args...'}
            className="w-full"
            theme={displayedTheme}
            onRun={handleRun}
            collection={collection}
            item={item}
          />

          {availableTools.length > 0 ? (
            <select
              className="tool-select px-2 h-full"
              value={tool}
              onChange={(e) => e.target.value && setTool(e.target.value)}
            >
              {!tool && <option value="">— select tool —</option>}
              {availableTools.map((t) => (
                <option key={t.name} value={t.name} title={t.description || ''}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="tool-input px-2 h-full"
              placeholder="tool name"
              value={tool}
              onChange={(e) => setTool(e.target.value)}
            />

          )}

          <div className="flex items-center h-full cursor-pointer gap-3 mx-3">
            <div
              className="infotip"
              onClick={(e) => {
                e.stopPropagation();
                if (!hasChanges) return;
                onSave();
              }}
            >
              <IconDeviceFloppy
                color={hasChanges ? theme.draftColor : theme.requestTabs.icon.color}
                strokeWidth={1.5}
                size={20}
                className={`${hasChanges ? 'cursor-pointer' : 'cursor-default'}`}
              />
              <span className="infotip-text text-xs">
                Save <span className="shortcut">({saveShortcut})</span>
              </span>
            </div>

            {connectionStatus === CONNECTION_STATUS.CONNECTED && (
              <div className="connection-controls relative flex items-center h-full">
                <div className="infotip" onClick={(e) => handleDisconnect(e, true)}>
                  <IconPlugConnectedX
                    color={theme.colors.text.danger}
                    strokeWidth={1.5}
                    size={20}
                    className="cursor-pointer"
                  />
                  <span className="infotip-text text-xs">Disconnect</span>
                </div>
              </div>
            )}

            {connectionStatus !== CONNECTION_STATUS.CONNECTED && (
              <div className="connection-controls relative flex items-center h-full">
                <div className="infotip" onClick={handleConnect}>
                  <IconPlugConnected
                    className={classnames('cursor-pointer', {
                      'animate-pulse': connectionStatus === CONNECTION_STATUS.CONNECTING
                    })}
                    color={theme.colors.text.green}
                    strokeWidth={1.5}
                    size={20}
                  />
                  <span className="infotip-text text-xs">Connect</span>
                </div>
              </div>
            )}
          </div>
          {connectionStatus === CONNECTION_STATUS.CONNECTED && <div className="connection-status-strip" />}
        </div>
        <SendButton onSend={handleRunClick} testId="run-button" />
      </div>
    </StyledWrapper>
  );
};

export default McpQueryUrl;
