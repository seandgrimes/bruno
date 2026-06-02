import type { KeyValue, Script, Variables } from '../common';

export type McpTransportType = 'http' | 'stdio';

export interface McpRequest {
  transport: McpTransportType;
  url: string;
  command: string;
  args: string;
  tool: string;
  headers: KeyValue[];
  body: McpRequestBody;
  script?: Script | null;
  vars?: {
    req: Variables;
    res: Variables;
  } | null;
  assertions?: KeyValue[] | null;
  tests?: string | null;
  docs?: string | null;
}

export interface McpRequestBody {
  mode: 'mcp';
  mcp: string;
}
