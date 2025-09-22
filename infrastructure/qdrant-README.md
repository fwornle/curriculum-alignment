# Qdrant Vector Database Configuration

This document describes the Qdrant vector database setup for the Curriculum Alignment System's semantic search capabilities.

## Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
# Initialize Qdrant collections and test connection
npm run qdrant:init

# Or directly:
./scripts/init-qdrant.ts
```

### Option 2: Manual Setup

#### Using Qdrant Cloud (Recommended for Production)
1. Go to [Qdrant Cloud](https://cloud.qdrant.io)
2. Create a new cluster:
   - Name: `curriculum-alignment-dev`
   - Region: `EU Central (Frankfurt)` 
   - Cluster size: `Free tier` (1GB RAM, 4 vCPUs)
3. Wait for cluster to be ready (2-3 minutes)
4. Get connection details from dashboard
5. Copy API key and cluster URL

#### Using Local Docker (Development)
```bash
# Start Qdrant with Docker
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Or with persistent storage
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

## Configuration Files

### 1. Environment Variables (.env.development)
```bash
# Copy from .env.example and update with your values
cp .env.example .env.development

# Required variables:
QDRANT_URL=https://your-cluster-id.qdrant.tech
QDRANT_API_KEY=your-qdrant-api-key
```

### 2. AWS Secrets Manager (Production)
```bash
aws secretsmanager create-secret \
  --name "curriculum-alignment/dev/qdrant" \
  --description "Qdrant vector database credentials" \
  --secret-string '{
    "url": "https://your-cluster-id.qdrant.tech",
    "api_key": "your-qdrant-api-key",
    "collections": {
      "curriculum_embeddings": {
        "vector_size": 1536,
        "distance": "Cosine"
      },
      "course_descriptions": {
        "vector_size": 1536,
        "distance": "Cosine"
      },
      "learning_outcomes": {
        "vector_size": 1536,
        "distance": "Cosine"
      }
    }
  }'
```

## Collection Configuration

The system uses three main collections optimized for curriculum analysis:

### 1. curriculum_embeddings
- **Purpose**: Full curriculum document embeddings
- **Vector Size**: 1536 (OpenAI Ada-002 compatible)
- **Distance**: Cosine similarity
- **Use Case**: Finding similar entire curriculum documents

### 2. course_descriptions  
- **Purpose**: Individual course description embeddings
- **Vector Size**: 1536
- **Distance**: Cosine similarity
- **Use Case**: Course-level similarity matching

### 3. learning_outcomes
- **Purpose**: Learning outcome embeddings
- **Vector Size**: 1536
- **Distance**: Cosine similarity  
- **Use Case**: Matching specific learning objectives

## Testing Connection

### Basic Test
```bash
npm run qdrant:health
```

### Health Check via API
```bash
curl -X GET "https://your-cluster-id.qdrant.tech/collections" \
  -H "api-key: your-qdrant-api-key"
```

### Manual Test with CLI
```bash
# Install Qdrant CLI (optional)
pip install qdrant-client

# Test connection
qdrant-client --url https://your-cluster-id.qdrant.tech \
  --api-key your-qdrant-api-key \
  collections list
```

## Vector Operations

### Embedding Generation
The system uses OpenAI's Ada-002 model for generating 1536-dimensional embeddings:
- **Model**: `text-embedding-ada-002`
- **Max Input**: 8192 tokens
- **Output**: 1536-dimensional vector
- **Cost**: ~$0.0001 per 1K tokens

### Search Operations
```typescript
// Example similarity search
const results = await qdrantClient.searchSimilar(
  'course_descriptions',
  embeddings,
  5  // limit
);
```

### Indexing Performance
- **HNSW Index**: Fast approximate search
- **M Parameter**: 16 (connections per node)
- **EF Construct**: 100 (search depth during construction)
- **Expected Performance**: <100ms for 1M vectors

## CloudFormation Deployment

The `qdrant-config.yaml` template creates:

1. **AWS Secrets Manager Secret**: Stores Qdrant credentials
2. **Lambda Health Check**: Monitors Qdrant connectivity  
3. **CloudWatch Alarms**: Alerts on health check failures
4. **SNS Topic**: Notification system for alerts

Deploy with:
```bash
aws cloudformation deploy \
  --template-file infrastructure/qdrant-config.yaml \
  --stack-name curriculum-alignment-qdrant-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM
```

## Monitoring and Performance

### Health Checks
- Automated health checks via Lambda function
- CloudWatch metrics for query performance  
- Collection size and vector count monitoring

### Performance Optimization
- **Collection Size**: Monitor vector count per collection
- **Query Latency**: Track search response times
- **Memory Usage**: Monitor cluster RAM utilization
- **Index Efficiency**: Review HNSW parameters

### Alerts
Set up CloudWatch alarms for:
- Health check failures
- High query response times  
- Collection size limits
- API rate limiting

## Cost Considerations

### Qdrant Cloud Pricing
- **Free Tier**: 1GB RAM, 4 vCPUs, 500MB storage
- **Standard**: $0.35/hour for 2GB RAM
- **Performance**: $1.40/hour for 8GB RAM

### Storage Estimates
- **1M vectors (1536-dim)**: ~6GB storage
- **Course descriptions**: ~100K vectors
- **Full curricula**: ~10K vectors
- **Learning outcomes**: ~500K vectors

### Cost Optimization Tips
- Use appropriate collection sizes
- Implement vector caching
- Batch similar operations
- Monitor API usage patterns

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   ```
   Error: connect ETIMEDOUT
   ```
   - Check QDRANT_URL format
   - Verify network connectivity
   - Check API key validity

2. **Authentication Failed**
   ```
   Error: 401 Unauthorized
   ```
   - Verify QDRANT_API_KEY
   - Check key permissions
   - Ensure cluster is active

3. **Collection Not Found**
   ```
   Error: Collection not found
   ```
   - Run `npm run qdrant:init`
   - Check collection names
   - Verify cluster initialization

4. **Vector Dimension Mismatch**
   ```
   Error: Wrong vector dimension
   ```
   - Ensure embeddings are 1536-dimensional
   - Check embedding model configuration
   - Verify collection vector_size setting

### Debug Commands

```bash
# Check collection status
curl -X GET "https://your-cluster-id.qdrant.tech/collections/curriculum_embeddings" \
  -H "api-key: your-qdrant-api-key"

# View cluster information  
curl -X GET "https://your-cluster-id.qdrant.tech/cluster" \
  -H "api-key: your-qdrant-api-key"

# Check CloudFormation stack
aws cloudformation describe-stacks \
  --stack-name curriculum-alignment-qdrant-dev

# View health check logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/curriculum-alignment-dev-qdrant-health
```

## Security Best Practices

### API Key Management
- Store API keys in AWS Secrets Manager
- Rotate keys regularly (quarterly)
- Use least-privilege access policies
- Never commit keys to version control

### Network Security
- Use HTTPS/TLS for all connections
- Implement proper firewall rules
- Monitor API access patterns
- Set up rate limiting

### Data Privacy
- Encrypt vectors at rest (Qdrant Cloud default)
- Implement data retention policies
- Review query logging settings
- Consider data anonymization

## Next Steps

After Qdrant configuration:
1. ✅ Task 4: Setup Qdrant Vector Database (this task)
2. ⏳ Task 5: Initialize AWS SAM Project
3. ⏳ Task 27: Implement Semantic Search Agent
4. ⏳ Task 14: Create LLM Model Configuration Service
5. ⏳ Task 24: Implement Document Processing Agent (for embedding generation)

## Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant Cloud Console](https://cloud.qdrant.io)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Vector Search Best Practices](https://qdrant.tech/articles/vector-search-optimization/)