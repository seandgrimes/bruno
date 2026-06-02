import { IconDeviceFloppy, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons';
import SendButton from 'components/RequestPane/SendButton';
import classnames from 'classnames';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { updateMcpRequestField } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { isMacOS } from 'utils/common/platform';
import { hasRequestChanges } from 'utils/collections';
import { mcpConnect, mcpDisconnect, getMcpConnectionStatus } from 'utils/network/index';
import { getAllVariables, getPropertyFromDraftOrRequest } from 'utils/collections/index';
import StyledWrapper from './StyledWrapper';

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

  const request = getPropertyFromDraftOrRequest(item, 'request');
  const url = item.draft ? (item.draft.request?.url || '') : (item.request?.url || '');
  const tool = request?.tool || '';
  const transport = request?.transport || 'http';

  const handleConnect = async () => {
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    const allVars = getAllVariables(collection, item);

    try {
      await mcpConnect(
        item.draft ? { ...item, request: item.draft.request } : item,
        collection,
        null,
        allVars
      );
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
      toast.success('Connected to MCP server');
    } catch (err) {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      toast.error(`MCP connection failed: ${err.message}`);
    }
  };

  const handleDisconnect = async (e, notify) => {
    e && e.stopPropagation();
    try {
      await mcpDisconnect(item.uid);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      notify && toast.success('MCP connection closed');
    } catch (err) {
      console.error('Failed to close MCP connection:', err);
      notify && toast.error('Failed to close MCP connection');
    }
  };

  const handleRunClick = async (e) => {
    e.stopPropagation();
    if (!tool) {
      toast.error('Please specify a tool name');
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

  const handleToolChange = (e) => {
    dispatch(updateMcpRequestField({
      itemUid: item.uid,
      collectionUid: collection.uid,
      field: 'tool',
      value: e.target.value
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
          <input
            className="tool-input px-2 h-full"
            placeholder="tool name"
            value={tool}
            onChange={handleToolChange}
          />
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
