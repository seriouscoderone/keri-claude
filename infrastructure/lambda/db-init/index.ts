import {
  RDSDataClient,
  ExecuteStatementCommand,
} from '@aws-sdk/client-rds-data';

const client = new RDSDataClient({});

const SQL_STATEMENTS = [
  'CREATE EXTENSION IF NOT EXISTS vector',
  'CREATE SCHEMA IF NOT EXISTS bedrock_integration',
  `CREATE TABLE IF NOT EXISTS bedrock_integration.bedrock_kb (
    id uuid PRIMARY KEY,
    embedding vector(1024),
    chunks text,
    metadata jsonb
  )`,
  `CREATE INDEX IF NOT EXISTS bedrock_kb_embedding_idx
    ON bedrock_integration.bedrock_kb
    USING hnsw (embedding vector_cosine_ops)`,
  `CREATE INDEX IF NOT EXISTS bedrock_kb_chunks_idx
    ON bedrock_integration.bedrock_kb
    USING gin (to_tsvector('english', chunks))`,
];

export const handler = async (event: {
  RequestType: string;
  ResourceProperties: {
    resourceArn: string;
    secretArn: string;
    database: string;
  };
}) => {
  const { resourceArn, secretArn, database } = event.ResourceProperties;

  if (event.RequestType === 'Delete') {
    console.log('Delete event — nothing to tear down');
    return;
  }

  console.log('Initializing database', { resourceArn, database });

  for (const sql of SQL_STATEMENTS) {
    console.log('Executing:', sql.substring(0, 60));
    await client.send(
      new ExecuteStatementCommand({
        resourceArn,
        secretArn,
        database,
        sql,
      }),
    );
  }

  console.log('Database initialization complete');
};
