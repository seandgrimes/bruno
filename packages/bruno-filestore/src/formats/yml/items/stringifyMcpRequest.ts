import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { McpRequest as BrunoMcpRequest } from '@usebruno/schema-types/requests/mcp';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';

const stringifyMcpRequest = (item: BrunoItem): string => {
  try {
    const brunoRequest = item.request as BrunoMcpRequest;

    const ocRequest: Record<string, any> = {};

    // info block
    const info: Record<string, any> = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'mcp'
    };
    if (item.seq) info.seq = item.seq;
    if (item.tags?.length) info.tags = item.tags;
    ocRequest.info = info;

    // mcp block
    const mcp: Record<string, any> = {
      transport: brunoRequest.transport || 'http'
    };

    if (brunoRequest.transport === 'stdio') {
      if (isNonEmptyString(brunoRequest.command)) mcp.command = brunoRequest.command;
      if (isNonEmptyString(brunoRequest.args)) mcp.args = brunoRequest.args;
    } else {
      if (isNonEmptyString(brunoRequest.url)) mcp.url = brunoRequest.url;
    }

    if (isNonEmptyString(brunoRequest.tool)) mcp.tool = brunoRequest.tool;

    const headers = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) mcp.headers = headers;

    ocRequest.mcp = mcp;

    // params (tool arguments)
    if (brunoRequest.body?.mode === 'mcp' && isNonEmptyString(brunoRequest.body.mcp)) {
      ocRequest.params = brunoRequest.body.mcp;
    }

    // runtime block
    const runtime: Record<string, any> = {};
    let hasRuntime = false;

    const variables = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      runtime.variables = variables; hasRuntime = true;
    }

    const scripts = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      runtime.scripts = scripts; hasRuntime = true;
    }

    if (hasRuntime) ocRequest.runtime = runtime;

    // docs
    if (isNonEmptyString(brunoRequest.docs)) ocRequest.docs = brunoRequest.docs;

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying MCP request:', error);
    throw error;
  }
};

export default stringifyMcpRequest;
