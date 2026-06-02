import React, { useMemo, useCallback } from 'react';
import Documentation from 'components/Documentation/index';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import CodeEditor from 'components/CodeEditor';
import { useDispatch, useSelector } from 'react-redux';
import { find } from 'lodash';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import { updateRequestBody, updateMcpRequestField } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import { getPropertyFromDraftOrRequest } from 'utils/collections/index';
import SingleLineEditor from 'components/SingleLineEditor/index';
import Vars from 'components/RequestPane/Vars';
import Script from 'components/RequestPane/Script';
import Assertions from 'components/RequestPane/Assertions';
import Tests from 'components/RequestPane/Tests';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';

const McpRequestPane = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab || 'params';

  const selectTab = useCallback(
    (tab) => {
      dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: tab }));
    },
    [dispatch, item.uid]
  );

  const request = getPropertyFromDraftOrRequest(item, 'request');
  const headers = getPropertyFromDraftOrRequest(item, 'request.headers');
  const docs = getPropertyFromDraftOrRequest(item, 'request.docs');
  const transport = request?.transport || 'http';
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');

  const activeHeadersLength = (headers || []).filter((h) => h.enabled).length;

  const setField = (field, value) => {
    dispatch(updateMcpRequestField({
      itemUid: item.uid,
      collectionUid: collection.uid,
      field,
      value
    }));
  };

  const allTabs = useMemo(() => [
    { key: 'connection', label: 'Connection', indicator: null },
    {
      key: 'params',
      label: 'Params',
      indicator: null
    },
    {
      key: 'headers',
      label: 'Headers',
      indicator: activeHeadersLength > 0 ? <sup className="ml-[.125rem] font-medium">{activeHeadersLength}</sup> : null
    },
    { key: 'vars', label: 'Vars', indicator: null },
    { key: 'script', label: 'Script', indicator: null },
    { key: 'assert', label: 'Assert', indicator: null },
    { key: 'tests', label: 'Tests', indicator: null },
    {
      key: 'docs',
      label: 'Docs',
      indicator: docs && docs.length > 0 ? <span className="ml-1 text-xs opacity-60">●</span> : null
    }
  ], [activeHeadersLength, docs]);

  const tabPanel = useMemo(() => {
    switch (requestPaneTab) {
      case 'connection': {
        return (
          <div className="p-4 overflow-y-auto h-full">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Transport</label>
              <div className="mcp-transport-toggle">
                <label
                  className={transport === 'http' ? 'active' : ''}
                  onClick={() => setField('transport', 'http')}
                >
                  HTTP
                </label>
                <label
                  className={transport === 'stdio' ? 'active' : ''}
                  onClick={() => setField('transport', 'stdio')}
                >
                  stdio
                </label>
              </div>
            </div>

            {transport === 'http' ? (
              <div className="mcp-field-row">
                <label>Server URL</label>
                <SingleLineEditor
                  value={request?.url || ''}
                  onChange={(val) => setField('url', val)}
                  placeholder="http://localhost:3000/mcp"
                  theme={displayedTheme}
                  collection={collection}
                  item={item}
                />
              </div>
            ) : (
              <>
                <div className="mcp-field-row">
                  <label>Command</label>
                  <SingleLineEditor
                    value={request?.command || ''}
                    onChange={(val) => setField('command', val)}
                    placeholder="npx"
                    theme={displayedTheme}
                    collection={collection}
                    item={item}
                  />
                </div>
                <div className="mcp-field-row">
                  <label>Arguments</label>
                  <SingleLineEditor
                    value={request?.args || ''}
                    onChange={(val) => setField('args', val)}
                    placeholder="-y @modelcontextprotocol/server-filesystem /path"
                    theme={displayedTheme}
                    collection={collection}
                    item={item}
                  />
                </div>
              </>
            )}

            <div className="mcp-field-row">
              <label>Tool Name</label>
              <SingleLineEditor
                value={request?.tool || ''}
                onChange={(val) => setField('tool', val)}
                placeholder="tool_name"
                theme={displayedTheme}
                collection={collection}
                item={item}
              />
            </div>
          </div>
        );
      }
      case 'params': {
        return (
          <CodeEditor
            value={body?.mcp || '{}'}
            onEdit={(val) =>
              dispatch(updateRequestBody({
                content: val,
                itemUid: item.uid,
                collectionUid: collection.uid
              }))}
            onSave={() => dispatch(saveRequest(item.uid, collection.uid))}
            mode="application/json"
            theme={displayedTheme}
          />
        );
      }
      case 'headers': {
        return <RequestHeaders item={item} collection={collection} addHeaderText="Add Header" />;
      }
      case 'vars': {
        return <Vars item={item} collection={collection} />;
      }
      case 'script': {
        return <Script item={item} collection={collection} />;
      }
      case 'assert': {
        return <Assertions item={item} collection={collection} />;
      }
      case 'tests': {
        return <Tests item={item} collection={collection} />;
      }
      case 'docs': {
        return <Documentation item={item} collection={collection} />;
      }
      default:
        return <div className="mt-4">404 | Not found</div>;
    }
  }, [requestPaneTab, item, collection, transport, request, body, displayedTheme, dispatch]);

  if (!activeTabUid || !focusedTab?.uid) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <ResponsiveTabs
        tabs={allTabs}
        activeTab={requestPaneTab}
        onTabSelect={selectTab}
      />
      <section className="flex w-full flex-1 h-full mt-4">
        <HeightBoundContainer>
          {tabPanel}
        </HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default McpRequestPane;
