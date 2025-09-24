#!/bin/bash

# Automated Backup Scheduler for Curriculum Alignment System
# Manages different backup schedules based on environment and requirements

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
LOG_FILE="/var/log/curriculum-backup-scheduler.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    local message="[SCHEDULER] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_success() {
    local message="[SCHEDULER] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_error() {
    local message="[SCHEDULER] $(date '+%Y-%m-%d %H:%M:%S') $1"
    echo -e "${RED}$message${NC}" >&2
    echo "$message" >> "$LOG_FILE"
}

# Check if backup script exists
if [[ ! -x "$BACKUP_SCRIPT" ]]; then
    log_error "Backup script not found or not executable: $BACKUP_SCRIPT"
    exit 1
fi

# Backup schedule configurations
declare -A BACKUP_SCHEDULES

# Production schedules
BACKUP_SCHEDULES[production_full_daily]="0 2 * * *"
BACKUP_SCHEDULES[production_database_hourly]="0 */4 * * *"
BACKUP_SCHEDULES[production_config_daily]="0 3 * * *"
BACKUP_SCHEDULES[production_documents_weekly]="0 1 * * 0"

# Staging schedules
BACKUP_SCHEDULES[staging_full_daily]="0 1 * * *"
BACKUP_SCHEDULES[staging_database_hourly]="0 */6 * * *"
BACKUP_SCHEDULES[staging_documents_weekly]="0 23 * * 6"

# Development schedules
BACKUP_SCHEDULES[development_database_daily]="0 4 * * *"
BACKUP_SCHEDULES[development_full_weekly]="0 5 * * 1"

# Function to install crontab entries
install_cron_schedules() {
    local environment="$1"
    
    log_info "Installing cron schedules for environment: $environment"
    
    # Create temporary crontab file
    local temp_cron=$(mktemp)
    
    # Preserve existing crontab (excluding our entries)
    if crontab -l 2>/dev/null | grep -v "curriculum-alignment-backup" > "$temp_cron"; then
        log_info "Preserved existing crontab entries"
    fi
    
    # Add backup schedules for the environment
    for schedule_key in "${!BACKUP_SCHEDULES[@]}"; do
        if [[ "$schedule_key" == "${environment}_"* ]]; then
            local backup_type="${schedule_key##*_}"
            local cron_schedule="${BACKUP_SCHEDULES[$schedule_key]}"
            
            # Add environment variables and backup command
            cat >> "$temp_cron" << EOF
# curriculum-alignment-backup: $schedule_key
S3_BACKUP_BUCKET=curriculum-alignment-backups-$environment
BACKUP_RETENTION_DAYS=30
ENABLE_ENCRYPTION=true
$cron_schedule $BACKUP_SCRIPT $environment $backup_type >> /var/log/curriculum-backup-cron.log 2>&1
EOF
            
            log_info "Added schedule: $schedule_key ($cron_schedule)"
        fi
    done
    
    # Install new crontab
    if crontab "$temp_cron"; then
        log_success "Crontab updated successfully"
    else
        log_error "Failed to update crontab"
        rm "$temp_cron"
        exit 1
    fi
    
    rm "$temp_cron"
}

# Function to remove cron schedules
remove_cron_schedules() {
    log_info "Removing curriculum-alignment backup cron schedules"
    
    # Create temporary crontab file without our entries
    local temp_cron=$(mktemp)
    
    if crontab -l 2>/dev/null | grep -v "curriculum-alignment-backup" > "$temp_cron"; then
        if crontab "$temp_cron"; then
            log_success "Backup cron schedules removed"
        else
            log_error "Failed to update crontab"
        fi
    else
        # No existing crontab or no entries to preserve
        crontab -r 2>/dev/null || true
        log_success "Crontab cleared"
    fi
    
    rm "$temp_cron"
}

# Function to show current schedules
show_schedules() {
    local environment="${1:-all}"
    
    echo -e "${BLUE}Configured Backup Schedules:${NC}\n"
    
    for schedule_key in "${!BACKUP_SCHEDULES[@]}"; do
        if [[ "$environment" == "all" || "$schedule_key" == "${environment}_"* ]]; then
            local backup_type="${schedule_key##*_}"
            local cron_schedule="${BACKUP_SCHEDULES[$schedule_key]}"
            local env_name="${schedule_key%%_*}"
            
            echo -e "${GREEN}$env_name${NC} - ${YELLOW}$backup_type${NC}: $cron_schedule"
        fi
    done
    
    echo -e "\n${BLUE}Current Crontab Entries:${NC}"
    crontab -l 2>/dev/null | grep -E "(curriculum-alignment-backup|$BACKUP_SCRIPT)" || echo "No backup cron entries found"
}

# Function to test backup execution
test_backup() {
    local environment="$1"
    local backup_type="${2:-database}"
    
    log_info "Testing backup execution: $environment $backup_type"
    
    if "$BACKUP_SCRIPT" "$environment" "$backup_type"; then
        log_success "Test backup completed successfully"
    else
        log_error "Test backup failed"
        exit 1
    fi
}

# Function to create systemd timer (alternative to cron)
create_systemd_timer() {
    local environment="$1"
    
    log_info "Creating systemd timer for environment: $environment"
    
    # Create service file
    sudo tee "/etc/systemd/system/curriculum-backup-$environment.service" > /dev/null << EOF
[Unit]
Description=Curriculum Alignment Backup Service ($environment)
After=network.target

[Service]
Type=oneshot
User=curriculum-backup
Group=curriculum-backup
Environment=S3_BACKUP_BUCKET=curriculum-alignment-backups-$environment
Environment=BACKUP_RETENTION_DAYS=30
Environment=ENABLE_ENCRYPTION=true
ExecStart=$BACKUP_SCRIPT $environment full
StandardOutput=journal
StandardError=journal
EOF

    # Create timer file
    local timer_schedule="*-*-* 02:00:00"  # Daily at 2 AM
    case "$environment" in
        production)
            timer_schedule="*-*-* 02:00:00"  # Daily at 2 AM
            ;;
        staging)
            timer_schedule="*-*-* 01:00:00"  # Daily at 1 AM
            ;;
        development)
            timer_schedule="Mon *-*-* 04:00:00"  # Weekly on Monday at 4 AM
            ;;
    esac
    
    sudo tee "/etc/systemd/system/curriculum-backup-$environment.timer" > /dev/null << EOF
[Unit]
Description=Curriculum Alignment Backup Timer ($environment)
Requires=curriculum-backup-$environment.service

[Timer]
OnCalendar=$timer_schedule
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

    # Reload systemd and enable timer
    sudo systemctl daemon-reload
    sudo systemctl enable "curriculum-backup-$environment.timer"
    sudo systemctl start "curriculum-backup-$environment.timer"
    
    log_success "Systemd timer created and enabled for $environment"
}

# Function to setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation for backup logs"
    
    sudo tee "/etc/logrotate.d/curriculum-backup" > /dev/null << 'EOF'
/var/log/curriculum-backup*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 0644 root root
}
EOF

    log_success "Log rotation configured"
}

# Function to create backup user and permissions
setup_backup_user() {
    log_info "Setting up backup user and permissions"
    
    # Create backup user
    if ! id curriculum-backup &>/dev/null; then
        sudo useradd -r -s /bin/bash -d /var/lib/curriculum-backup -m curriculum-backup
        log_success "Created backup user: curriculum-backup"
    fi
    
    # Create directories
    sudo mkdir -p /var/lib/curriculum-backup/{scripts,logs,temp}
    sudo chown -R curriculum-backup:curriculum-backup /var/lib/curriculum-backup
    
    # Copy scripts
    sudo cp "$SCRIPT_DIR"/backup.sh /var/lib/curriculum-backup/scripts/
    sudo cp "$SCRIPT_DIR"/restore.sh /var/lib/curriculum-backup/scripts/
    sudo chown curriculum-backup:curriculum-backup /var/lib/curriculum-backup/scripts/*.sh
    sudo chmod +x /var/lib/curriculum-backup/scripts/*.sh
    
    log_success "Backup user setup completed"
}

# Main function
main() {
    case "${1:-help}" in
        install)
            if [[ -z "$2" ]]; then
                log_error "Environment required for install command"
                echo "Usage: $0 install <environment>"
                exit 1
            fi
            install_cron_schedules "$2"
            ;;
        remove)
            remove_cron_schedules
            ;;
        show)
            show_schedules "$2"
            ;;
        test)
            if [[ -z "$2" ]]; then
                log_error "Environment required for test command"
                echo "Usage: $0 test <environment> [backup_type]"
                exit 1
            fi
            test_backup "$2" "$3"
            ;;
        systemd)
            if [[ -z "$2" ]]; then
                log_error "Environment required for systemd command"
                echo "Usage: $0 systemd <environment>"
                exit 1
            fi
            create_systemd_timer "$2"
            ;;
        setup)
            setup_backup_user
            setup_log_rotation
            ;;
        logrotate)
            setup_log_rotation
            ;;
        help|--help|-h)
            cat << EOF
Backup Schedule Manager for Curriculum Alignment System

Usage: $0 <command> [options]

Commands:
  install <env>     Install cron schedules for environment
  remove            Remove all backup cron schedules
  show [env]        Show configured schedules (all or specific environment)
  test <env> [type] Test backup execution
  systemd <env>     Create systemd timer (alternative to cron)
  setup             Setup backup user and permissions
  logrotate         Setup log rotation for backup logs
  help              Show this help message

Environments:
  production        Full production backup schedule
  staging           Staging environment backup schedule  
  development       Development environment backup schedule

Examples:
  $0 install production     # Install production backup schedules
  $0 show                   # Show all configured schedules
  $0 test staging database  # Test staging database backup
  $0 systemd production     # Create systemd timer for production

Environment Variables:
  S3_BACKUP_BUCKET         Override S3 backup bucket
  BACKUP_RETENTION_DAYS    Override retention period
  ENABLE_ENCRYPTION        Enable/disable encryption

EOF
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"