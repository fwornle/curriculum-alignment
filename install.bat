@echo off
REM Multi-Agent Curriculum Alignment System (MACAS) - Windows Installation Script
REM Comprehensive one-command installation for Windows systems

setlocal EnableDelayedExpansion
set "SCRIPT_DIR=%~dp0"
set "LOG_FILE=%SCRIPT_DIR%install.log"

REM Colors (using PowerShell for colored output)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "BOLD=[1m"
set "NC=[0m"

REM System requirements
set "MIN_NODE_VERSION=18.0.0"
set "MIN_NPM_VERSION=8.0.0"
set "MIN_PYTHON_VERSION=3.8.0"

REM Installation flags
set "INSTALL_NODE=false"
set "INSTALL_NPM=false"
set "INSTALL_PYTHON=false"
set "INSTALL_GIT=false"
set "INSTALL_AWS_CLI=false"
set "INSTALL_SAM_CLI=false"
set "INSTALL_CHOCOLATEY=false"

echo.
echo ===============================================================================
echo                Multi-Agent Curriculum Alignment System (MACAS)
echo                            Windows Installation Script
echo ===============================================================================
echo.

echo [%date% %time%] Starting installation... > "%LOG_FILE%"

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%ERROR: Please run this script as Administrator%NC%
    echo [%date% %time%] ERROR: Not running as Administrator >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo %BLUE%✓ Running as Administrator%NC%
echo [%date% %time%] Running as Administrator >> "%LOG_FILE%"

REM Check Windows version
for /f "tokens=4-5 delims=. " %%i in ('ver') do set "WIN_VERSION=%%i.%%j"
echo %BLUE%ℹ️  Windows Version: %WIN_VERSION%%NC%
echo [%date% %time%] Windows Version: %WIN_VERSION% >> "%LOG_FILE%"

REM Check system architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set "ARCH=x64"
) else if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    set "ARCH=x86"
) else (
    set "ARCH=%PROCESSOR_ARCHITECTURE%"
)
echo %BLUE%ℹ️  Architecture: %ARCH%%NC%
echo [%date% %time%] Architecture: %ARCH% >> "%LOG_FILE%"

echo.
echo %BOLD%%CYAN%🚀 Checking Prerequisites%NC%
echo ========================================

REM Check for Chocolatey
where choco >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  Chocolatey not found - will install%NC%
    echo [%date% %time%] Chocolatey not found >> "%LOG_FILE%"
    set "INSTALL_CHOCOLATEY=true"
) else (
    echo %GREEN%✅ Chocolatey found%NC%
    echo [%date% %time%] Chocolatey found >> "%LOG_FILE%"
)

REM Check for Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  Git not found - will install%NC%
    echo [%date% %time%] Git not found >> "%LOG_FILE%"
    set "INSTALL_GIT=true"
) else (
    for /f "tokens=3" %%i in ('git --version') do (
        echo %GREEN%✅ Git found: %%i%NC%
        echo [%date% %time%] Git found: %%i >> "%LOG_FILE%"
    )
)

REM Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  Node.js not found - will install%NC%
    echo [%date% %time%] Node.js not found >> "%LOG_FILE%"
    set "INSTALL_NODE=true"
) else (
    for /f "tokens=1 delims=v" %%i in ('node --version') do (
        set "NODE_VERSION=%%i"
        echo %GREEN%✅ Node.js found: %%i%NC%
        echo [%date% %time%] Node.js found: %%i >> "%LOG_FILE%"
    )
    REM TODO: Add version comparison logic
)

REM Check for npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  npm not found - will install with Node.js%NC%
    echo [%date% %time%] npm not found >> "%LOG_FILE%"
    set "INSTALL_NPM=true"
) else (
    for /f %%i in ('npm --version') do (
        echo %GREEN%✅ npm found: %%i%NC%
        echo [%date% %time%] npm found: %%i >> "%LOG_FILE%"
    )
)

REM Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  Python not found - will install%NC%
    echo [%date% %time%] Python not found >> "%LOG_FILE%"
    set "INSTALL_PYTHON=true"
) else (
    for /f "tokens=2" %%i in ('python --version') do (
        echo %GREEN%✅ Python found: %%i%NC%
        echo [%date% %time%] Python found: %%i >> "%LOG_FILE%"
    )
)

REM Check for AWS CLI
where aws >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  AWS CLI not found - will install%NC%
    echo [%date% %time%] AWS CLI not found >> "%LOG_FILE%"
    set "INSTALL_AWS_CLI=true"
) else (
    for /f "tokens=1-3" %%i in ('aws --version 2^>^&1') do (
        echo %GREEN%✅ AWS CLI found: %%i %%j %%k%NC%
        echo [%date% %time%] AWS CLI found: %%i %%j %%k >> "%LOG_FILE%"
    )
)

REM Check for SAM CLI
where sam >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️  SAM CLI not found - will install%NC%
    echo [%date% %time%] SAM CLI not found >> "%LOG_FILE%"
    set "INSTALL_SAM_CLI=true"
) else (
    for /f "tokens=1-3" %%i in ('sam --version') do (
        echo %GREEN%✅ SAM CLI found: %%i %%j %%k%NC%
        echo [%date% %time%] SAM CLI found: %%i %%j %%k >> "%LOG_FILE%"
    )
)

REM Check disk space (minimum 2GB)
for /f "tokens=3" %%i in ('dir "%SCRIPT_DIR%" /-c ^| find "bytes free"') do (
    set "AVAILABLE_SPACE=%%i"
)
set /a "AVAILABLE_GB=!AVAILABLE_SPACE! / 1073741824"
if !AVAILABLE_GB! lss 2 (
    echo %RED%❌ Insufficient disk space. Required: 2GB, Available: !AVAILABLE_GB!GB%NC%
    echo [%date% %time%] Insufficient disk space: !AVAILABLE_GB!GB >> "%LOG_FILE%"
    pause
    exit /b 1
)
echo %GREEN%✅ Disk space check passed: !AVAILABLE_GB!GB available%NC%
echo [%date% %time%] Disk space check passed: !AVAILABLE_GB!GB >> "%LOG_FILE%"

REM Check internet connectivity
ping -n 1 google.com >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ No internet connection available%NC%
    echo [%date% %time%] No internet connection >> "%LOG_FILE%"
    pause
    exit /b 1
)
echo %GREEN%✅ Internet connectivity verified%NC%
echo [%date% %time%] Internet connectivity verified >> "%LOG_FILE%"

echo.
echo %GREEN%✅ Prerequisite check completed%NC%
echo [%date% %time%] Prerequisite check completed >> "%LOG_FILE%"

echo.
echo %BOLD%%CYAN%🚀 Installing Dependencies%NC%
echo ========================================

REM Install Chocolatey if needed
if "%INSTALL_CHOCOLATEY%"=="true" (
    echo %BLUE%Installing Chocolatey...%NC%
    echo [%date% %time%] Installing Chocolatey >> "%LOG_FILE%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
    if !errorlevel! neq 0 (
        echo %RED%❌ Failed to install Chocolatey%NC%
        echo [%date% %time%] Failed to install Chocolatey >> "%LOG_FILE%"
        pause
        exit /b 1
    )
    REM Refresh environment variables
    call refreshenv
    echo %GREEN%✅ Chocolatey installed%NC%
    echo [%date% %time%] Chocolatey installed >> "%LOG_FILE%"
)

REM Install Git if needed
if "%INSTALL_GIT%"=="true" (
    echo %BLUE%Installing Git...%NC%
    echo [%date% %time%] Installing Git >> "%LOG_FILE%"
    choco install git -y
    if !errorlevel! neq 0 (
        echo %RED%❌ Failed to install Git%NC%
        echo [%date% %time%] Failed to install Git >> "%LOG_FILE%"
        pause
        exit /b 1
    )
    echo %GREEN%✅ Git installed%NC%
    echo [%date% %time%] Git installed >> "%LOG_FILE%"
)

REM Install Node.js if needed
if "%INSTALL_NODE%"=="true" (
    echo %BLUE%Installing Node.js...%NC%
    echo [%date% %time%] Installing Node.js >> "%LOG_FILE%"
    choco install nodejs --version=18.19.0 -y
    if !errorlevel! neq 0 (
        echo %RED%❌ Failed to install Node.js%NC%
        echo [%date% %time%] Failed to install Node.js >> "%LOG_FILE%"
        pause
        exit /b 1
    )
    REM Refresh environment variables
    call refreshenv
    echo %GREEN%✅ Node.js installed%NC%
    echo [%date% %time%] Node.js installed >> "%LOG_FILE%"
)

REM Install Python if needed
if "%INSTALL_PYTHON%"=="true" (
    echo %BLUE%Installing Python...%NC%
    echo [%date% %time%] Installing Python >> "%LOG_FILE%"
    choco install python3 -y
    if !errorlevel! neq 0 (
        echo %RED%❌ Failed to install Python%NC%
        echo [%date% %time%] Failed to install Python >> "%LOG_FILE%"
        pause
        exit /b 1
    )
    echo %GREEN%✅ Python installed%NC%
    echo [%date% %time%] Python installed >> "%LOG_FILE%"
)

REM Install AWS CLI if needed
if "%INSTALL_AWS_CLI%"=="true" (
    echo %BLUE%Installing AWS CLI...%NC%
    echo [%date% %time%] Installing AWS CLI >> "%LOG_FILE%"
    choco install awscli -y
    if !errorlevel! neq 0 (
        echo %RED%❌ Failed to install AWS CLI%NC%
        echo [%date% %time%] Failed to install AWS CLI >> "%LOG_FILE%"
        pause
        exit /b 1
    )
    echo %GREEN%✅ AWS CLI installed%NC%
    echo [%date% %time%] AWS CLI installed >> "%LOG_FILE%"
)

REM Install SAM CLI if needed
if "%INSTALL_SAM_CLI%"=="true" (
    echo %BLUE%Installing SAM CLI...%NC%
    echo [%date% %time%] Installing SAM CLI >> "%LOG_FILE%"
    choco install aws-sam-cli -y
    if !errorlevel! neq 0 (
        echo %RED%❌ Failed to install SAM CLI%NC%
        echo [%date% %time%] Failed to install SAM CLI >> "%LOG_FILE%"
        pause
        exit /b 1
    )
    echo %GREEN%✅ SAM CLI installed%NC%
    echo [%date% %time%] SAM CLI installed >> "%LOG_FILE%"
)

REM Install additional tools
echo %BLUE%Installing additional tools...%NC%
echo [%date% %time%] Installing additional tools >> "%LOG_FILE%"
choco install jq wget postgresql -y
if !errorlevel! neq 0 (
    echo %YELLOW%⚠️  Some additional tools may not have installed correctly%NC%
    echo [%date% %time%] Some additional tools installation issues >> "%LOG_FILE%"
)

REM Refresh environment variables after installations
call refreshenv

echo.
echo %GREEN%✅ Dependencies installation completed%NC%
echo [%date% %time%] Dependencies installation completed >> "%LOG_FILE%"

echo.
echo %BOLD%%CYAN%🚀 Setting up Project%NC%
echo ========================================

REM Install root dependencies
echo %BLUE%Installing root dependencies...%NC%
echo [%date% %time%] Installing root dependencies >> "%LOG_FILE%"
cd /d "%SCRIPT_DIR%"
call npm install
if !errorlevel! neq 0 (
    echo %RED%❌ Failed to install root dependencies%NC%
    echo [%date% %time%] Failed to install root dependencies >> "%LOG_FILE%"
    pause
    exit /b 1
)
echo %GREEN%✅ Root dependencies installed%NC%
echo [%date% %time%] Root dependencies installed >> "%LOG_FILE%"

REM Install frontend dependencies
echo %BLUE%Installing frontend dependencies...%NC%
echo [%date% %time%] Installing frontend dependencies >> "%LOG_FILE%"
cd /d "%SCRIPT_DIR%\frontend"
call npm install
if !errorlevel! neq 0 (
    echo %RED%❌ Failed to install frontend dependencies%NC%
    echo [%date% %time%] Failed to install frontend dependencies >> "%LOG_FILE%"
    pause
    exit /b 1
)
cd /d "%SCRIPT_DIR%"
echo %GREEN%✅ Frontend dependencies installed%NC%
echo [%date% %time%] Frontend dependencies installed >> "%LOG_FILE%"

REM Install database dependencies if directory exists
if exist "%SCRIPT_DIR%\database" (
    echo %BLUE%Installing database dependencies...%NC%
    echo [%date% %time%] Installing database dependencies >> "%LOG_FILE%"
    cd /d "%SCRIPT_DIR%\database"
    call npm install
    if !errorlevel! neq 0 (
        echo %YELLOW%⚠️  Database dependencies installation had issues%NC%
        echo [%date% %time%] Database dependencies installation issues >> "%LOG_FILE%"
    )
    cd /d "%SCRIPT_DIR%"
    echo %GREEN%✅ Database dependencies installed%NC%
    echo [%date% %time%] Database dependencies installed >> "%LOG_FILE%"
)

REM Setup Git hooks
echo %BLUE%Setting up Git hooks...%NC%
echo [%date% %time%] Setting up Git hooks >> "%LOG_FILE%"
call npx husky install
if !errorlevel! neq 0 (
    echo %YELLOW%⚠️  Git hooks setup had issues%NC%
    echo [%date% %time%] Git hooks setup issues >> "%LOG_FILE%"
)
echo %GREEN%✅ Git hooks configured%NC%
echo [%date% %time%] Git hooks configured >> "%LOG_FILE%"

REM Build the project
echo %BLUE%Building the project...%NC%
echo [%date% %time%] Building the project >> "%LOG_FILE%"
call npm run build
if !errorlevel! neq 0 (
    echo %RED%❌ Failed to build project%NC%
    echo [%date% %time%] Failed to build project >> "%LOG_FILE%"
    pause
    exit /b 1
)
echo %GREEN%✅ Project built successfully%NC%
echo [%date% %time%] Project built successfully >> "%LOG_FILE%"

echo.
echo %GREEN%✅ Project setup completed%NC%
echo [%date% %time%] Project setup completed >> "%LOG_FILE%"

echo.
echo %BOLD%%CYAN%🚀 Setting up Environment%NC%
echo ========================================

REM Create .env file from template
if not exist "%SCRIPT_DIR%\.env" (
    echo %BLUE%Creating .env file from template...%NC%
    echo [%date% %time%] Creating .env file from template >> "%LOG_FILE%"
    copy "%SCRIPT_DIR%\.env.example" "%SCRIPT_DIR%\.env"
    echo %GREEN%✅ .env file created%NC%
    echo [%date% %time%] .env file created >> "%LOG_FILE%"
    echo %YELLOW%⚠️  Please edit .env file with your specific configuration%NC%
) else (
    echo %BLUE%ℹ️  .env file already exists%NC%
    echo [%date% %time%] .env file already exists >> "%LOG_FILE%"
)

REM Create necessary directories
if not exist "%SCRIPT_DIR%\logs" mkdir "%SCRIPT_DIR%\logs"
if not exist "%SCRIPT_DIR%\tmp" mkdir "%SCRIPT_DIR%\tmp"
if not exist "%SCRIPT_DIR%\uploads" mkdir "%SCRIPT_DIR%\uploads"

echo %GREEN%✅ Environment configuration completed%NC%
echo [%date% %time%] Environment configuration completed >> "%LOG_FILE%"

echo.
echo %BOLD%%CYAN%🚀 Validating Installation%NC%
echo ========================================

REM Test Node.js and npm
echo %BLUE%Testing Node.js and npm...%NC%
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%❌ Node.js validation failed%NC%
    echo [%date% %time%] Node.js validation failed >> "%LOG_FILE%"
    pause
    exit /b 1
)

call npm --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%❌ npm validation failed%NC%
    echo [%date% %time%] npm validation failed >> "%LOG_FILE%"
    pause
    exit /b 1
)
echo %GREEN%✅ Node.js and npm validation passed%NC%
echo [%date% %time%] Node.js and npm validation passed >> "%LOG_FILE%"

REM Test TypeScript compilation
echo %BLUE%Testing TypeScript compilation...%NC%
call npm run typecheck >nul 2>&1
if !errorlevel! neq 0 (
    echo %YELLOW%⚠️  TypeScript compilation has issues%NC%
    echo [%date% %time%] TypeScript compilation issues >> "%LOG_FILE%"
) else (
    echo %GREEN%✅ TypeScript compilation validated%NC%
    echo [%date% %time%] TypeScript compilation validated >> "%LOG_FILE%"
)

REM Test AWS CLI
echo %BLUE%Testing AWS CLI...%NC%
aws --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%❌ AWS CLI validation failed%NC%
    echo [%date% %time%] AWS CLI validation failed >> "%LOG_FILE%"
) else (
    echo %GREEN%✅ AWS CLI validated%NC%
    echo [%date% %time%] AWS CLI validated >> "%LOG_FILE%"
)

REM Test SAM CLI
echo %BLUE%Testing SAM CLI...%NC%
sam --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%❌ SAM CLI validation failed%NC%
    echo [%date% %time%] SAM CLI validation failed >> "%LOG_FILE%"
) else (
    echo %GREEN%✅ SAM CLI validated%NC%
    echo [%date% %time%] SAM CLI validated >> "%LOG_FILE%"
)

echo.
echo %GREEN%✅ Installation validation completed%NC%
echo [%date% %time%] Installation validation completed >> "%LOG_FILE%"

echo.
echo %BOLD%%GREEN%🎉 Installation completed successfully!%NC%
echo [%date% %time%] Installation completed successfully >> "%LOG_FILE%"

echo.
echo %BOLD%Next Steps:%NC%
echo ========================================
echo.
echo %CYAN%1. Configure Environment:%NC%
echo    Edit the .env file with your specific configuration:
echo    notepad .env
echo.
echo %CYAN%2. Configure AWS Credentials:%NC%
echo    aws configure
echo    # OR set environment variables:
echo    set AWS_PROFILE=your-profile
echo.
echo %CYAN%3. Setup Database:%NC%
echo    # For Supabase:
echo    npm run db:setup
echo    # For local PostgreSQL:
echo    createdb curriculum_alignment
echo    npm run migrate:up
echo.
echo %CYAN%4. Initialize Vector Database:%NC%
echo    npm run qdrant:init
echo.
echo %CYAN%5. Start Development Server:%NC%
echo    npm run dev
echo    # This will start both frontend and SAM local API
echo.
echo %CYAN%6. Deploy to AWS (optional):%NC%
echo    # Development environment:
echo    npm run deploy:dev
echo    # Production environment:
echo    npm run deploy:prod
echo.
echo %CYAN%7. Run Tests:%NC%
echo    npm test
echo.
echo %CYAN%8. Access the Application:%NC%
echo    Frontend: http://localhost:3000
echo    API: http://localhost:3001
echo.
echo %YELLOW%📋 Configuration Notes:%NC%
echo • Database: Configure PostgreSQL connection in .env
echo • Vector DB: Set up Qdrant cloud instance or local deployment
echo • AWS: Ensure proper IAM permissions for Lambda, S3, API Gateway
echo • LLM APIs: Add API keys to AWS Secrets Manager (recommended) or .env
echo.
echo %BLUE%📚 Documentation:%NC%
echo • README.md - Project overview and architecture
echo • SAM-README.md - AWS SAM deployment guide
echo • scripts\Backup-README.md - Backup and recovery procedures
echo.
echo %RED%⚠️  Important Security Notes:%NC%
echo • Never commit .env files with real credentials to version control
echo • Use AWS Secrets Manager for production API keys
echo • Review and adjust IAM policies for minimal required permissions
echo.
echo Installation log saved to: %LOG_FILE%
echo.
echo Press any key to exit...
pause >nul