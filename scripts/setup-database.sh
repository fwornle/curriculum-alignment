#!/bin/bash

# Curriculum Alignment System - Database Setup Script
# Sets up PostgreSQL database with Supabase or Neon

set -e

echo "🗄️  Database Setup for Curriculum Alignment System"
echo "=================================================="

# Check prerequisites
command -v curl >/dev/null 2>&1 || { echo "❌ curl is required but not installed. Aborting." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required but not installed. Aborting." >&2; exit 1; }

# Configuration
ENVIRONMENT=${1:-dev}
PROVIDER=${2:-supabase}

echo "Environment: $ENVIRONMENT"
echo "Provider: $PROVIDER"
echo ""

# Function to setup Supabase
setup_supabase() {
    echo "🚀 Setting up Supabase (Free Tier)"
    echo "1. Go to https://supabase.com"
    echo "2. Create a new account or sign in"
    echo "3. Create a new project:"
    echo "   - Project name: curriculum-alignment-$ENVIRONMENT"
    echo "   - Database password: [Generate a strong password]"
    echo "   - Region: eu-central-1 (Frankfurt)"
    echo "4. Wait for project to be ready (2-3 minutes)"
    echo ""
    echo "📋 After project creation, collect these values:"
    echo "   - Project URL: https://your-project-id.supabase.co"
    echo "   - Project API URL: https://your-project-id.supabase.co/rest/v1/"
    echo "   - anon/public key: (from Settings > API)"
    echo "   - service_role key: (from Settings > API)"
    echo "   - Database URL: postgresql://postgres:[password]@db.your-project-id.supabase.co:5432/postgres"
    echo ""
}

# Function to setup Neon
setup_neon() {
    echo "🚀 Setting up Neon (Free Tier)"
    echo "1. Go to https://neon.tech"
    echo "2. Create a new account or sign in"
    echo "3. Create a new project:"
    echo "   - Project name: curriculum-alignment-$ENVIRONMENT"
    echo "   - Database name: curriculum_alignment"
    echo "   - Region: EU Central (Frankfurt)"
    echo "4. Project will be ready immediately"
    echo ""
    echo "📋 After project creation, collect these values:"
    echo "   - Connection string: postgresql://username:password@ep-name.eu-central-1.neon.tech/curriculum_alignment"
    echo "   - Host: ep-name.eu-central-1.neon.tech"
    echo "   - Database: curriculum_alignment"
    echo ""
}

# Function to test database connection
test_connection() {
    echo "🧪 Testing Database Connection"
    echo "Please enter your database connection string:"
    read -r DATABASE_URL
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ No connection string provided"
        return 1
    fi
    
    # Test connection using psql if available
    if command -v psql >/dev/null 2>&1; then
        echo "Testing connection with psql..."
        if psql "$DATABASE_URL" -c "SELECT version();" >/dev/null 2>&1; then
            echo "✅ Database connection successful!"
            return 0
        else
            echo "❌ Database connection failed"
            return 1
        fi
    else
        echo "⚠️  psql not available. Please test connection manually."
        return 0
    fi
}

# Function to create AWS Secrets Manager secret
create_aws_secret() {
    echo "🔐 Creating AWS Secrets Manager Secret"
    
    if ! command -v aws >/dev/null 2>&1; then
        echo "❌ AWS CLI not installed. Please install and configure AWS CLI first."
        return 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo "❌ AWS credentials not configured. Please run 'aws configure' first."
        return 1
    fi
    
    echo "Please provide database connection details:"
    read -p "Host: " DB_HOST
    read -p "Port (5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -p "Database name: " DB_NAME
    read -p "Username: " DB_USER
    read -s -p "Password: " DB_PASS
    echo ""
    
    # Create secret JSON
    SECRET_JSON=$(cat <<EOF
{
  "host": "$DB_HOST",
  "port": "$DB_PORT",
  "database": "$DB_NAME",
  "username": "$DB_USER",
  "password": "$DB_PASS",
  "ssl": true,
  "connection_limit": 20,
  "pool_timeout": 30000,
  "idle_timeout": 600000,
  "connection_string": "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"
}
EOF
)
    
    SECRET_NAME="curriculum-alignment/$ENVIRONMENT/database"
    
    # Create or update secret
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
        echo "Updating existing secret..."
        aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --secret-string "$SECRET_JSON"
    else
        echo "Creating new secret..."
        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --description "PostgreSQL database credentials for Curriculum Alignment System" \
            --secret-string "$SECRET_JSON"
    fi
    
    echo "✅ AWS Secret created/updated: $SECRET_NAME"
}

# Function to create environment file
create_env_file() {
    echo "📝 Creating Environment File"
    
    ENV_FILE=".env.$ENVIRONMENT"
    
    if [ -f "$ENV_FILE" ]; then
        echo "⚠️  $ENV_FILE already exists. Creating backup..."
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    echo "Please provide database connection details:"
    read -p "Database URL: " DATABASE_URL
    
    if [ "$PROVIDER" = "supabase" ]; then
        read -p "Supabase URL: " SUPABASE_URL
        read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
        read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
    fi
    
    # Create environment file
    cat > "$ENV_FILE" <<EOF
# Database Configuration
DATABASE_URL=$DATABASE_URL
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_ACQUIRE_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=600000

EOF
    
    if [ "$PROVIDER" = "supabase" ]; then
        cat >> "$ENV_FILE" <<EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

EOF
    fi
    
    # Add other environment variables from example
    echo "# Copy remaining variables from .env.example as needed" >> "$ENV_FILE"
    
    echo "✅ Environment file created: $ENV_FILE"
    echo "📝 Please review and update the file with your specific configuration"
}

# Main menu
echo "Please choose an option:"
echo "1. Setup Supabase (Recommended)"
echo "2. Setup Neon"
echo "3. Test database connection"
echo "4. Create AWS Secrets Manager secret"
echo "5. Create environment file"
echo "6. All setup steps"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        setup_supabase
        ;;
    2)
        setup_neon
        ;;
    3)
        test_connection
        ;;
    4)
        create_aws_secret
        ;;
    5)
        create_env_file
        ;;
    6)
        if [ "$PROVIDER" = "supabase" ]; then
            setup_supabase
        else
            setup_neon
        fi
        echo ""
        read -p "Press Enter when you have created your database and collected the credentials..."
        test_connection
        create_aws_secret
        create_env_file
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Database setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env.$ENVIRONMENT file with the correct values"
echo "2. Test the database connection"
echo "3. Run database migrations (when ready)"
echo "4. Configure connection pooling in your application"
echo ""
echo "📚 Documentation:"
echo "- Supabase: https://supabase.com/docs"
echo "- Neon: https://neon.tech/docs"
echo "- AWS Secrets Manager: https://docs.aws.amazon.com/secretsmanager/"