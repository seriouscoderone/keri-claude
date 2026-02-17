import {
  RDSDataClient,
  ExecuteStatementCommand,
} from '@aws-sdk/client-rds-data';

const client = new RDSDataClient({});

function sqlStatements(dimension: string) {
  return [
    'CREATE EXTENSION IF NOT EXISTS vector',
    'CREATE SCHEMA IF NOT EXISTS bedrock_integration',
    // Drop and recreate if dimension changed (CREATE IF NOT EXISTS won't update column types)
    `DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='bedrock_integration' AND table_name='bedrock_kb') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='bedrock_integration' AND table_name='bedrock_kb' AND column_name='embedding'
            AND udt_name='vector' AND character_maximum_length IS NULL
            AND EXISTS (
              SELECT 1 FROM pg_attribute a JOIN pg_class c ON a.attrelid=c.oid JOIN pg_namespace n ON c.relnamespace=n.oid
              WHERE n.nspname='bedrock_integration' AND c.relname='bedrock_kb' AND a.attname='embedding'
                AND format_type(a.atttypid, a.atttypmod) = 'vector(${dimension})'
            )
        ) THEN
          DROP TABLE bedrock_integration.bedrock_kb;
        END IF;
      END IF;
    END $$`,
    `CREATE TABLE IF NOT EXISTS bedrock_integration.bedrock_kb (
      id uuid PRIMARY KEY,
      embedding vector(${dimension}),
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
}

export const handler = async (event: {
  RequestType: string;
  ResourceProperties: {
    resourceArn: string;
    secretArn: string;
    database: string;
    embeddingDimension: string;
  };
}) => {
  const { resourceArn, secretArn, database, embeddingDimension } = event.ResourceProperties;

  if (event.RequestType === 'Delete') {
    console.log('Delete event — nothing to tear down');
    return;
  }

  const dimension = embeddingDimension || '3072';
  console.log('Initializing database', { resourceArn, database, dimension });

  for (const sql of sqlStatements(dimension)) {
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
