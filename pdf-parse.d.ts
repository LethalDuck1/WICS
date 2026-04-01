declare module "pdf-parse" {
  const pdf: (dataBuffer: Buffer) => Promise<{
    text: string;
    numpages: number;
    numrender: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  }>;

  export default pdf;
}
