import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { McpRequest as BrunoMcpRequest } from '@usebruno/schema-types/requests/mcp';
import { toBrunoHttpHeaders } from '../common/headers';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { uuid, ensureString } from '../../../utils';

const parseMcpRequest = (ocRequest: Record<string, any>): BrunoItem => {
  const info = ocRequest.info;
  const mcp = ocRequest.mcp || {};
  const runtime = ocRequest.runtime;

  const brunoRequest: BrunoMcpRequest = {
    transport: (mcp.transport === 'stdio' ? 'stdio' : 'http'),
    url: ensureString(mcp.url),
    command: ensureString(mcp.command),
    args: ensureString(mcp.args),
    tool: ensureString(mcp.tool),
    headers: toBrunoHttpHeaders(mcp.headers) || [],
    body: {
      mode: 'mcp',
      mcp: typeof ocRequest.params === 'string' ? ocRequest.params : '{}'
    },
    script: { req: null, res: null },
    vars: { req: [], res: [] },
    assertions: [],
    tests: null,
    docs: null
  };

  // scripts
  const scripts = toBrunoScripts(runtime?.scripts);
  if (scripts?.script && brunoRequest.script) {
    if (scripts.script.req) brunoRequest.script!.req = scripts.script.req;
    if (scripts.script.res) brunoRequest.script!.res = scripts.script.res;
  }
  if (scripts?.tests) brunoRequest.tests = scripts.tests;

  // variables
  brunoRequest.vars = toBrunoVariables(runtime?.variables);

  // docs
  if (ocRequest.docs) brunoRequest.docs = ocRequest.docs;

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'mcp-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest,
    settings: {} as any,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return brunoItem;
};

export default parseMcpRequest;
