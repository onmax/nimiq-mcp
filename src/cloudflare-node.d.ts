// Type declarations for cloudflare:node module
declare module 'cloudflare:node' {
  /**
   * Routes incoming Worker requests to a Node.js HTTP server
   * @param port The port number the Node.js server is listening on
   * @param request The incoming Web Standard Request
   * @returns A Web Standard Response from the Node.js server
   */
  export function handleAsNodeRequest(port: number, request: Request): Promise<Response>
}
