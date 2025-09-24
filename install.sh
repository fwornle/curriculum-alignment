#!/bin/bash

# Multi-Agent Curriculum Alignment System (MACAS) - Installation Script
# Comprehensive one-command installation for Unix-like systems (Linux/macOS)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/install.log"
INSTALL_START_TIME=$(date)

# System requirements
MIN_NODE_VERSION="18.0.0"
MIN_NPM_VERSION="8.0.0"
MIN_PYTHON_VERSION="3.8.0"

# Environment detection
OS="$(uname -s)"
ARCH="$(uname -m)"
IS_MACOS=false
IS_LINUX=false

case "$OS" in
    Darwin*)
        IS_MACOS=true
        PACKAGE_MANAGER="brew"
        ;;
    Linux*)
        IS_LINUX=true
        if command -v apt-get >/dev/null 2>&1; then
            PACKAGE_MANAGER="apt"
        elif command -v yum >/dev/null 2>&1; then
            PACKAGE_MANAGER="yum"
        elif command -v dnf >/dev/null 2>&1; then
            PACKAGE_MANAGER="dnf"
        else
            PACKAGE_MANAGER="unknown"
        fi
        ;;
    *)
        echo -e "${RED}❌ Unsupported operating system: $OS${NC}"
        exit 1
        ;;
esac

# Logging functions
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    log "${GREEN}✅ $1${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    log "${RED}❌ $1${NC}"
    exit 1
}

log_step() {
    echo -e "\n${BOLD}${CYAN}🚀 $1${NC}" | tee -a "$LOG_FILE"
}

# Progress tracking
progress() {
    local current=$1
    local total=$2
    local description="$3"
    local percent=$(( current * 100 / total ))
    local filled=$(( percent / 2 ))
    local empty=$(( 50 - filled ))
    
    printf "\r${BLUE}[%s%s] %d%% - %s${NC}" \
        "$(printf "%${filled}s" | tr ' ' '█')" \
        "$(printf "%${empty}s")" \
        "$percent" \
        "$description"
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# Version comparison function
version_compare() {
    echo "$@" | awk -F. '{ printf("%d%03d%03d%03d\n", $1,$2,$3,$4); }' | head -n1
}

# Check if version is greater than or equal to minimum
version_ge() {
    test "$(version_compare "$1")" -ge "$(version_compare "$2")"
}

# Prerequisite checks
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    local checks=0
    local total_checks=10
    
    # Check operating system
    progress $((++checks)) $total_checks "Checking operating system"
    log_info "Operating System: $OS ($ARCH)"
    
    # Check internet connectivity
    progress $((++checks)) $total_checks "Checking internet connectivity"
    if ! ping -c 1 google.com >/dev/null 2>&1; then
        log_error "No internet connection available"
    fi
    log_success "Internet connectivity verified"
    
    # Check for git
    progress $((++checks)) $total_checks "Checking Git installation"
    if ! command -v git >/dev/null 2>&1; then
        log_warning "Git not found - will attempt to install"
        INSTALL_GIT=true
    else
        log_success "Git found: $(git --version)"
    fi
    
    # Check for curl
    progress $((++checks)) $total_checks "Checking curl installation"
    if ! command -v curl >/dev/null 2>&1; then
        log_warning "curl not found - will attempt to install"
        INSTALL_CURL=true
    else
        log_success "curl found: $(curl --version | head -n1)"
    fi
    
    # Check for Node.js
    progress $((++checks)) $total_checks "Checking Node.js installation"
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | sed 's/v//')
        if version_ge "$NODE_VERSION" "$MIN_NODE_VERSION"; then
            log_success "Node.js found: v$NODE_VERSION"
        else
            log_warning "Node.js version $NODE_VERSION is below minimum required $MIN_NODE_VERSION"
            INSTALL_NODE=true
        fi
    else
        log_warning "Node.js not found - will attempt to install"
        INSTALL_NODE=true
    fi
    
    # Check for npm
    progress $((++checks)) $total_checks "Checking npm installation"
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        if version_ge "$NPM_VERSION" "$MIN_NPM_VERSION"; then
            log_success "npm found: v$NPM_VERSION"
        else
            log_warning "npm version $NPM_VERSION is below minimum required $MIN_NPM_VERSION"
            INSTALL_NPM=true
        fi
    else
        log_warning "npm not found - will attempt to install"
        INSTALL_NPM=true
    fi
    
    # Check for Python
    progress $((++checks)) $total_checks "Checking Python installation"
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        if version_ge "$PYTHON_VERSION" "$MIN_PYTHON_VERSION"; then
            log_success "Python found: v$PYTHON_VERSION"
        else
            log_warning "Python version $PYTHON_VERSION is below minimum required $MIN_PYTHON_VERSION"
            INSTALL_PYTHON=true
        fi
    else
        log_warning "Python3 not found - will attempt to install"
        INSTALL_PYTHON=true
    fi
    
    # Check for AWS CLI
    progress $((++checks)) $total_checks "Checking AWS CLI installation"
    if ! command -v aws >/dev/null 2>&1; then
        log_warning "AWS CLI not found - will attempt to install"
        INSTALL_AWS_CLI=true
    else
        log_success "AWS CLI found: $(aws --version)"
    fi
    
    # Check for SAM CLI
    progress $((++checks)) $total_checks "Checking SAM CLI installation"
    if ! command -v sam >/dev/null 2>&1; then
        log_warning "SAM CLI not found - will attempt to install"
        INSTALL_SAM_CLI=true
    else
        log_success "SAM CLI found: $(sam --version)"
    fi
    
    # Check disk space (minimum 2GB)
    progress $((++checks)) $total_checks "Checking available disk space"
    AVAILABLE_SPACE=$(df "$SCRIPT_DIR" | tail -1 | awk '{print $4}')
    REQUIRED_SPACE=2097152  # 2GB in KB
    
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        log_error "Insufficient disk space. Required: 2GB, Available: $(($AVAILABLE_SPACE / 1024 / 1024))GB"
    fi
    log_success "Disk space check passed"
    
    echo ""
    log_success "Prerequisite check completed"
}

# Install package manager if needed
install_package_manager() {
    if [ "$IS_MACOS" = true ] && ! command -v brew >/dev/null 2>&1; then
        log_step "Installing Homebrew"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        log_success "Homebrew installed"
    fi
}

# Install system dependencies
install_dependencies() {
    log_step "Installing System Dependencies"
    
    local deps_installed=0
    local total_deps=8
    
    install_package_manager
    
    # Install Git if needed
    if [ "$INSTALL_GIT" = true ]; then
        progress $((++deps_installed)) $total_deps "Installing Git"
        if [ "$IS_MACOS" = true ]; then
            brew install git
        elif [ "$PACKAGE_MANAGER" = "apt" ]; then
            sudo apt-get update && sudo apt-get install -y git
        elif [ "$PACKAGE_MANAGER" = "yum" ]; then
            sudo yum install -y git
        elif [ "$PACKAGE_MANAGER" = "dnf" ]; then
            sudo dnf install -y git
        fi
        log_success "Git installed"
    else
        progress $((++deps_installed)) $total_deps "Git already installed"
    fi
    
    # Install curl if needed
    if [ "$INSTALL_CURL" = true ]; then
        progress $((++deps_installed)) $total_deps "Installing curl"
        if [ "$IS_MACOS" = true ]; then
            brew install curl
        elif [ "$PACKAGE_MANAGER" = "apt" ]; then
            sudo apt-get install -y curl
        elif [ "$PACKAGE_MANAGER" = "yum" ]; then
            sudo yum install -y curl
        elif [ "$PACKAGE_MANAGER" = "dnf" ]; then
            sudo dnf install -y curl
        fi
        log_success "curl installed"
    else
        progress $((++deps_installed)) $total_deps "curl already installed"
    fi
    
    # Install Node.js if needed
    if [ "$INSTALL_NODE" = true ]; then
        progress $((++deps_installed)) $total_deps "Installing Node.js"
        if [ "$IS_MACOS" = true ]; then
            brew install node@18
        elif [ "$PACKAGE_MANAGER" = "apt" ]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif [ "$PACKAGE_MANAGER" = "yum" ] || [ "$PACKAGE_MANAGER" = "dnf" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo $PACKAGE_MANAGER install -y nodejs
        fi
        log_success "Node.js installed"
    else
        progress $((++deps_installed)) $total_deps "Node.js already installed"
    fi
    
    # Install Python if needed
    if [ "$INSTALL_PYTHON" = true ]; then
        progress $((++deps_installed)) $total_deps "Installing Python"
        if [ "$IS_MACOS" = true ]; then
            brew install python@3.11
        elif [ "$PACKAGE_MANAGER" = "apt" ]; then
            sudo apt-get install -y python3 python3-pip python3-venv
        elif [ "$PACKAGE_MANAGER" = "yum" ] || [ "$PACKAGE_MANAGER" = "dnf" ]; then
            sudo $PACKAGE_MANAGER install -y python3 python3-pip
        fi
        log_success "Python installed"
    else
        progress $((++deps_installed)) $total_deps "Python already installed"
    fi
    
    # Install AWS CLI if needed
    if [ "$INSTALL_AWS_CLI" = true ]; then
        progress $((++deps_installed)) $total_deps "Installing AWS CLI"
        if [ "$IS_MACOS" = true ]; then
            if [ "$ARCH" = "arm64" ]; then
                curl "https://awscli.amazonaws.com/AWSCLIV2-arm64.pkg" -o "AWSCLIV2.pkg"
            else
                curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
            fi
            sudo installer -pkg AWSCLIV2.pkg -target /
            rm AWSCLIV2.pkg
        else
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
            rm -rf aws awscliv2.zip
        fi
        log_success "AWS CLI installed"
    else
        progress $((++deps_installed)) $total_deps "AWS CLI already installed"
    fi
    
    # Install SAM CLI if needed
    if [ "$INSTALL_SAM_CLI" = true ]; then
        progress $((++deps_installed)) $total_deps "Installing SAM CLI"
        if [ "$IS_MACOS" = true ]; then
            brew tap aws/tap
            brew install aws-sam-cli
        else
            if [ "$ARCH" = "x86_64" ]; then
                wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
                unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
                sudo ./sam-installation/install
                rm -rf sam-installation aws-sam-cli-linux-x86_64.zip
            else
                log_warning "SAM CLI installation on $ARCH architecture requires manual installation"
                log_info "Please visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
            fi
        fi
        log_success "SAM CLI installed"
    else
        progress $((++deps_installed)) $total_deps "SAM CLI already installed"
    fi
    
    # Install additional tools
    progress $((++deps_installed)) $total_deps "Installing additional tools"
    if [ "$IS_MACOS" = true ]; then
        brew install jq wget postgresql-client
    elif [ "$PACKAGE_MANAGER" = "apt" ]; then
        sudo apt-get install -y jq wget postgresql-client-common postgresql-client
    elif [ "$PACKAGE_MANAGER" = "yum" ] || [ "$PACKAGE_MANAGER" = "dnf" ]; then
        sudo $PACKAGE_MANAGER install -y jq wget postgresql
    fi
    log_success "Additional tools installed"
    
    # Verify installations
    progress $((++deps_installed)) $total_deps "Verifying installations"
    node --version >/dev/null 2>&1 || log_error "Node.js installation verification failed"
    npm --version >/dev/null 2>&1 || log_error "npm installation verification failed"
    aws --version >/dev/null 2>&1 || log_error "AWS CLI installation verification failed"
    sam --version >/dev/null 2>&1 || log_error "SAM CLI installation verification failed"
    
    echo ""
    log_success "All dependencies installed successfully"
}

# Setup project dependencies
setup_project() {
    log_step "Setting up Project Dependencies"
    
    local setup_steps=0
    local total_steps=6
    
    # Install root dependencies
    progress $((++setup_steps)) $total_steps "Installing root dependencies"
    npm install || log_error "Failed to install root dependencies"
    log_success "Root dependencies installed"
    
    # Install frontend dependencies
    progress $((++setup_steps)) $total_steps "Installing frontend dependencies"
    cd "$SCRIPT_DIR/frontend" || log_error "Frontend directory not found"
    npm install || log_error "Failed to install frontend dependencies"
    cd "$SCRIPT_DIR"
    log_success "Frontend dependencies installed"
    
    # Install database dependencies
    if [ -d "$SCRIPT_DIR/database" ]; then
        progress $((++setup_steps)) $total_steps "Installing database dependencies"
        cd "$SCRIPT_DIR/database"
        npm install || log_error "Failed to install database dependencies"
        cd "$SCRIPT_DIR"
        log_success "Database dependencies installed"
    else
        progress $((++setup_steps)) $total_steps "Skipping database dependencies (not found)"
    fi
    
    # Setup husky hooks
    progress $((++setup_steps)) $total_steps "Setting up Git hooks"
    npx husky install || log_warning "Failed to setup husky hooks"
    log_success "Git hooks configured"
    
    # Build the project
    progress $((++setup_steps)) $total_steps "Building the project"
    npm run build || log_error "Failed to build project"
    log_success "Project built successfully"
    
    # Run type checking
    progress $((++setup_steps)) $total_steps "Running type checking"
    npm run typecheck || log_warning "Type checking found issues"
    log_success "Type checking completed"
    
    echo ""
    log_success "Project setup completed"
}

# Setup environment configuration
setup_environment() {
    log_step "Setting up Environment Configuration"
    
    # Create .env file from template
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log_info "Creating .env file from template"
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        log_success ".env file created"
        log_warning "Please edit .env file with your specific configuration"
    else
        log_info ".env file already exists"
    fi
    
    # Create necessary directories
    mkdir -p "$SCRIPT_DIR/logs"
    mkdir -p "$SCRIPT_DIR/tmp"
    mkdir -p "$SCRIPT_DIR/uploads"
    
    # Set permissions
    chmod 755 "$SCRIPT_DIR/scripts"/*.sh || true
    chmod 644 "$SCRIPT_DIR/.env"
    
    log_success "Environment configuration completed"
}

# Validate installation
validate_installation() {
    log_step "Validating Installation"
    
    local validations=0
    local total_validations=8
    
    # Test Node.js and npm
    progress $((++validations)) $total_validations "Testing Node.js and npm"
    node --version >/dev/null 2>&1 || log_error "Node.js validation failed"
    npm --version >/dev/null 2>&1 || log_error "npm validation failed"
    log_success "Node.js and npm validation passed"
    
    # Test project dependencies
    progress $((++validations)) $total_validations "Testing project dependencies"
    npm list --depth=0 >/dev/null 2>&1 || log_warning "Some project dependencies may have issues"
    log_success "Project dependencies validated"
    
    # Test TypeScript compilation
    progress $((++validations)) $total_validations "Testing TypeScript compilation"
    npm run typecheck >/dev/null 2>&1 || log_warning "TypeScript compilation has issues"
    log_success "TypeScript compilation validated"
    
    # Test AWS CLI
    progress $((++validations)) $total_validations "Testing AWS CLI"
    aws --version >/dev/null 2>&1 || log_error "AWS CLI validation failed"
    log_success "AWS CLI validated"
    
    # Test SAM CLI
    progress $((++validations)) $total_validations "Testing SAM CLI"
    sam --version >/dev/null 2>&1 || log_error "SAM CLI validation failed"
    log_success "SAM CLI validated"
    
    # Test build process
    progress $((++validations)) $total_validations "Testing build process"
    npm run build:frontend >/dev/null 2>&1 || log_error "Frontend build validation failed"
    log_success "Build process validated"
    
    # Test environment configuration
    progress $((++validations)) $total_validations "Testing environment configuration"
    [ -f "$SCRIPT_DIR/.env" ] || log_error ".env file not found"
    log_success "Environment configuration validated"
    
    # Test script permissions
    progress $((++validations)) $total_validations "Testing script permissions"
    [ -x "$SCRIPT_DIR/scripts/backup.sh" ] || log_warning "Some scripts may not be executable"
    log_success "Script permissions validated"
    
    echo ""
    log_success "Installation validation completed"
}

# Display next steps
show_next_steps() {
    echo ""
    echo -e "${BOLD}${GREEN}🎉 Installation completed successfully!${NC}"
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo ""
    echo -e "${CYAN}1. Configure Environment:${NC}"
    echo "   Edit the .env file with your specific configuration:"
    echo "   nano .env"
    echo ""
    echo -e "${CYAN}2. Configure AWS Credentials:${NC}"
    echo "   aws configure"
    echo "   # OR set environment variables:"
    echo "   export AWS_PROFILE=your-profile"
    echo ""
    echo -e "${CYAN}3. Setup Database:${NC}"
    echo "   # For Supabase:"
    echo "   npm run db:setup"
    echo "   # For local PostgreSQL:"
    echo "   createdb curriculum_alignment"
    echo "   npm run migrate:up"
    echo ""
    echo -e "${CYAN}4. Initialize Vector Database:${NC}"
    echo "   npm run qdrant:init"
    echo ""
    echo -e "${CYAN}5. Start Development Server:${NC}"
    echo "   npm run dev"
    echo "   # This will start both frontend and SAM local API"
    echo ""
    echo -e "${CYAN}6. Deploy to AWS (optional):${NC}"
    echo "   # Development environment:"
    echo "   npm run deploy:dev"
    echo "   # Production environment:"
    echo "   npm run deploy:prod"
    echo ""
    echo -e "${CYAN}7. Run Tests:${NC}"
    echo "   npm test"
    echo ""
    echo -e "${CYAN}8. Access the Application:${NC}"
    echo "   Frontend: http://localhost:3000"
    echo "   API: http://localhost:3001"
    echo ""
    echo -e "${YELLOW}📋 Configuration Notes:${NC}"
    echo "• Database: Configure PostgreSQL connection in .env"
    echo "• Vector DB: Set up Qdrant cloud instance or local deployment"
    echo "• AWS: Ensure proper IAM permissions for Lambda, S3, API Gateway"
    echo "• LLM APIs: Add API keys to AWS Secrets Manager (recommended) or .env"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "• README.md - Project overview and architecture"
    echo "• SAM-README.md - AWS SAM deployment guide"
    echo "• scripts/Backup-README.md - Backup and recovery procedures"
    echo ""
    echo -e "${RED}⚠️  Important Security Notes:${NC}"
    echo "• Never commit .env files with real credentials to version control"
    echo "• Use AWS Secrets Manager for production API keys"
    echo "• Review and adjust IAM policies for minimal required permissions"
    echo ""
    echo "Installation log saved to: $LOG_FILE"
    echo ""
}

# Cleanup on error
cleanup_on_error() {
    log_error "Installation failed. Check $LOG_FILE for details."
    echo ""
    echo -e "${YELLOW}Common troubleshooting steps:${NC}"
    echo "1. Check internet connectivity"
    echo "2. Verify system requirements (Node.js 18+, npm 8+)"
    echo "3. Ensure sufficient disk space (2GB minimum)"
    echo "4. Check permissions for package installation"
    echo "5. Review the installation log: $LOG_FILE"
    echo ""
    echo "For support, please visit:"
    echo "https://github.com/fwornle/curriculum-alignment/issues"
    exit 1
}

# Main installation function
main() {
    # Setup error handling
    trap cleanup_on_error ERR
    
    # Display header
    echo -e "${BOLD}${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              Multi-Agent Curriculum Alignment System (MACAS)                ║
║                                                                              ║
║                            Installation Script                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    log_info "Starting installation at $INSTALL_START_TIME"
    log_info "Operating System: $OS"
    log_info "Architecture: $ARCH"
    log_info "Package Manager: $PACKAGE_MANAGER"
    
    # Run installation steps
    check_prerequisites
    install_dependencies
    setup_project
    setup_environment
    validate_installation
    show_next_steps
    
    local install_end_time=$(date)
    log_success "Installation completed at $install_end_time"
    
    # Calculate installation time
    local start_seconds=$(date -d "$INSTALL_START_TIME" +%s 2>/dev/null || date -j -f "%a %b %d %T %Z %Y" "$INSTALL_START_TIME" +%s 2>/dev/null || echo 0)
    local end_seconds=$(date +%s)
    local duration=$((end_seconds - start_seconds))
    local duration_min=$((duration / 60))
    local duration_sec=$((duration % 60))
    
    echo -e "${BOLD}${GREEN}✅ Total installation time: ${duration_min}m ${duration_sec}s${NC}"
}

# Check for --help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Multi-Agent Curriculum Alignment System (MACAS) - Installation Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --no-deps      Skip dependency installation (for CI/CD)"
    echo "  --dev          Install development dependencies only"
    echo ""
    echo "This script will:"
    echo "1. Check system prerequisites"
    echo "2. Install required dependencies (Node.js, npm, AWS CLI, SAM CLI)"
    echo "3. Set up the project and install npm packages"
    echo "4. Configure the environment"
    echo "5. Validate the installation"
    echo ""
    echo "Requirements:"
    echo "• Operating System: macOS or Linux"
    echo "• Node.js: 18.0.0 or higher"
    echo "• npm: 8.0.0 or higher"
    echo "• Internet connection"
    echo "• 2GB free disk space"
    echo ""
    echo "For more information, see README.md"
    exit 0
fi

# Run main installation
main "$@"