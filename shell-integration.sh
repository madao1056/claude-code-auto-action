#!/bin/bash
# Claude Code Auto Action - Shell Integration
# Add this to your .bashrc, .zshrc, or .profile

# ========================================
# CLAUDE CLI WRAPPERS
# ========================================

# Main Claude wrapper with all automation flags
claude() {
    if [ "$CLAUDE_AUTO_MODE" = "true" ]; then
        # Use Python wrapper for complete automation
        if [ -f "$CLAUDE_AUTO_ARCHITECT_HOME/scripts/claude-auto.py" ]; then
            python3 "$CLAUDE_AUTO_ARCHITECT_HOME/scripts/claude-auto.py" "$@"
        elif [ -f "$CLAUDE_AUTO_ARCHITECT_HOME/scripts/claude-auto-wrapper.sh" ]; then
            "$CLAUDE_AUTO_ARCHITECT_HOME/scripts/claude-auto-wrapper.sh" "$@"
        else
            # Fallback to basic automation
            yes | command claude \
                --dangerously-skip-permissions \
                --non-interactive \
                --auto-approve \
                --batch-mode \
                "$@"
        fi
    else
        command claude "$@"
    fi
}

# Ultra-fast Claude command (skip all checks)
cca() {
    # Always use the Python wrapper for complete automation
    if [ -f "$CLAUDE_AUTO_ARCHITECT_HOME/scripts/claude-auto.py" ]; then
        CLAUDE_AUTO_MODE=true \
        CLAUDE_AUTO_APPROVE=true \
        CLAUDE_SKIP_CONFIRMATION=true \
        CLAUDE_NON_INTERACTIVE=true \
        python3 "$CLAUDE_AUTO_ARCHITECT_HOME/scripts/claude-auto.py" "$@"
    else
        # Fallback with yes command
        yes | CLAUDE_AUTO_MODE=true \
        CLAUDE_AUTO_APPROVE=true \
        CLAUDE_SKIP_CONFIRMATION=true \
        CLAUDE_NON_INTERACTIVE=true \
        claude --dangerously-skip-permissions --non-interactive --auto-approve "$@"
    fi
}

# Create new project with zero prompts
ccnew() {
    local project_name="$1"
    local requirements="${@:2}"
    
    if [ -z "$project_name" ]; then
        echo "Usage: ccnew <project-name> <requirements>"
        echo "Example: ccnew my-app 'E-commerce platform with React and Node.js'"
        return 1
    fi
    
    # Create project directory
    mkdir -p "$project_name"
    cd "$project_name"
    
    # Initialize with full automation
    source ~/.claude-auto-env
    
    # Create project with single command
    cca "Create a complete $requirements project. 
         Project name: $project_name
         Initialize git, install dependencies, create all necessary files,
         set up testing, linting, CI/CD, Docker, and documentation.
         Make it production-ready with best practices."
}

# Quick project scaffolding commands
ccapi() { ccnew "$1" "REST API with Node.js, Express, PostgreSQL, authentication, testing, and documentation"; }
ccweb() { ccnew "$1" "web application with React, Next.js, TypeScript, Tailwind CSS, and testing"; }
ccfull() { ccnew "$1" "full-stack application with React frontend, Node.js backend, PostgreSQL database, authentication, and deployment setup"; }
cccli() { ccnew "$1" "command-line tool with Node.js, TypeScript, testing, and npm publishing setup"; }
ccmobile() { ccnew "$1" "mobile application with React Native, TypeScript, navigation, and state management"; }

# ========================================
# AUTOMATION COMMANDS
# ========================================

# Enable full automation mode
claude-auto-on() {
    export CLAUDE_AUTO_MODE=true
    export CLAUDE_AUTO_DOCKER=true
    export CLAUDE_DOCKER_AUTO_START=true
    export CLAUDE_DOCKER_SKIP_CONFIRM=true
    source ~/.claude-auto-env
    echo "Claude automation mode: ON"
    echo "All prompts will be auto-approved (including Docker)"
}

# Disable automation mode
claude-auto-off() {
    unset CLAUDE_AUTO_MODE
    unset CLAUDE_AUTO_APPROVE
    unset CLAUDE_SKIP_CONFIRMATION
    unset CLAUDE_AUTO_DOCKER
    unset CLAUDE_DOCKER_AUTO_START
    unset CLAUDE_DOCKER_SKIP_CONFIRM
    echo "Claude automation mode: OFF"
    echo "Interactive prompts enabled"
}

# Enable Docker automation specifically
claude-docker-on() {
    export CLAUDE_AUTO_DOCKER=true
    export CLAUDE_DOCKER_AUTO_START=true
    export CLAUDE_DOCKER_SKIP_CONFIRM=true
    echo "Claude Docker automation: ON"
    echo "Docker commands will be auto-approved"
}

# Disable Docker automation
claude-docker-off() {
    unset CLAUDE_AUTO_DOCKER
    unset CLAUDE_DOCKER_AUTO_START
    unset CLAUDE_DOCKER_SKIP_CONFIRM
    echo "Claude Docker automation: OFF"
    echo "Docker commands will require confirmation"
}

# Check automation status
claude-status() {
    echo "Claude Automation Status:"
    echo "========================"
    echo "Auto Mode: ${CLAUDE_AUTO_MODE:-false}"
    echo "Auto Approve: ${CLAUDE_AUTO_APPROVE:-false}"
    echo "Docker Auto: ${CLAUDE_AUTO_DOCKER:-false}"
    echo "Docker Auto Start: ${CLAUDE_DOCKER_AUTO_START:-false}"
    echo "Skip Confirmations: ${CLAUDE_SKIP_CONFIRMATION:-false}"
    echo "Permissions Mode: ${CLAUDE_PERMISSIONS_MODE:-ask}"
    echo "Daily Cost Limit: \$${CLAUDE_COST_LIMIT_PER_DAY:-8}"
    echo "Config File: ${CLAUDE_CONFIG_FILE:-~/.claude/config.json}"
}

# ========================================
# PROJECT TEMPLATES
# ========================================

# Create project from template
claude-template() {
    local template="$1"
    local project_name="$2"
    
    case "$template" in
        "saas")
            ccnew "$project_name" "SaaS application with multi-tenancy, billing (Stripe), user management, admin dashboard, API, and deployment"
            ;;
        "marketplace")
            ccnew "$project_name" "marketplace platform with buyers, sellers, payments, reviews, search, and admin panel"
            ;;
        "blog")
            ccnew "$project_name" "blog platform with CMS, markdown support, comments, SEO optimization, and RSS"
            ;;
        "ecommerce")
            ccnew "$project_name" "e-commerce platform with products, cart, checkout, payments, inventory, and admin"
            ;;
        "social")
            ccnew "$project_name" "social media platform with posts, comments, likes, followers, and real-time updates"
            ;;
        "dashboard")
            ccnew "$project_name" "analytics dashboard with charts, real-time data, exports, and user management"
            ;;
        *)
            echo "Available templates:"
            echo "  saas        - Multi-tenant SaaS application"
            echo "  marketplace - Two-sided marketplace"
            echo "  blog        - Blog/CMS platform"
            echo "  ecommerce   - E-commerce store"
            echo "  social      - Social media platform"
            echo "  dashboard   - Analytics dashboard"
            echo ""
            echo "Usage: claude-template <template> <project-name>"
            ;;
    esac
}

# ========================================
# BATCH OPERATIONS
# ========================================

# Create multiple related projects
claude-create-stack() {
    local stack_name="$1"
    local base_dir="${2:-.}"
    
    if [ -z "$stack_name" ]; then
        echo "Usage: claude-create-stack <stack-name> [base-directory]"
        return 1
    fi
    
    mkdir -p "$base_dir/$stack_name"
    cd "$base_dir/$stack_name"
    
    # Enable full automation
    claude-auto-on
    
    # Create microservices stack
    echo "Creating microservices stack: $stack_name"
    
    # API Gateway
    ccnew "$stack_name-gateway" "API Gateway with Express, rate limiting, authentication, and request routing"
    cd ..
    
    # Auth Service
    ccnew "$stack_name-auth" "Authentication service with JWT, OAuth2, user management, and password reset"
    cd ..
    
    # Main API
    ccnew "$stack_name-api" "Main API service with business logic, database models, and REST endpoints"
    cd ..
    
    # Frontend
    ccnew "$stack_name-frontend" "React frontend with authentication, API integration, and responsive design"
    cd ..
    
    # Admin Panel
    ccnew "$stack_name-admin" "Admin dashboard with user management, analytics, and system monitoring"
    cd ..
    
    # Create docker-compose for the stack
    cca "Create a docker-compose.yml file that orchestrates all services:
         - gateway (port 3000)
         - auth service (port 3001)
         - api service (port 3002)
         - frontend (port 3003)
         - admin panel (port 3004)
         - PostgreSQL database
         - Redis cache
         - Include health checks, networks, and volumes"
    
    echo "Stack created successfully!"
}

# ========================================
# WORKFLOW AUTOMATION
# ========================================

# Auto-fix and commit
claude-fix() {
    claude-auto-on
    cca "Analyze the current project, fix all linting errors, format code,
         fix failing tests, update dependencies, and create a commit with
         a descriptive message of all changes made"
}

# Auto-document project
claude-document() {
    claude-auto-on
    cca "Generate comprehensive documentation for this project including:
         - Updated README with all features
         - API documentation
         - Architecture diagrams
         - Setup instructions
         - Deployment guide
         - Contributing guidelines"
}

# Auto-test project
claude-test() {
    claude-auto-on
    cca "Create comprehensive tests for this project:
         - Unit tests for all functions/methods
         - Integration tests for APIs
         - E2E tests for critical paths
         - Achieve >90% coverage
         - Add test documentation"
}

# Auto-optimize project
claude-optimize() {
    claude-auto-on
    cca "Optimize this project for production:
         - Performance improvements
         - Bundle size reduction
         - Database query optimization
         - Caching implementation
         - Security hardening
         - Error handling improvements"
}

# ========================================
# ALIASES
# ========================================

# Quick aliases
alias cc='claude'
alias cchelp='claude --help'
alias ccversion='claude --version'
alias ccconfig='claude config'
alias cccost='claude /cost'
alias cccompact='claude /compact'

# Project creation aliases
alias ccnext='ccweb'
alias ccnode='ccapi'
alias ccreact='ccweb'
alias ccexpress='ccapi'
alias ccdjango='ccnew $1 "Django web application with PostgreSQL, REST API, admin panel, and testing"'
alias ccrails='ccnew $1 "Ruby on Rails application with PostgreSQL, authentication, and testing"'
alias ccflask='ccnew $1 "Flask application with SQLAlchemy, authentication, and RESTful API"'
alias ccfastapi='ccnew $1 "FastAPI application with async support, PostgreSQL, authentication, and auto-documentation"'

# Workflow aliases
alias cccommit='cca "Stage all changes and create a conventional commit message"'
alias ccpr='cca "Create a pull request with a comprehensive description of changes"'
alias ccdeploy='cca "Prepare project for deployment and create deployment scripts"'
alias ccrefactor='cca "Refactor code to improve quality, apply design patterns, and reduce complexity"'

# ========================================
# AUTO-COMPLETION (for zsh)
# ========================================

if [ -n "$ZSH_VERSION" ]; then
    # Basic completion for claude commands
    _claude_complete() {
        local -a commands
        commands=(
            'create:Create a new project'
            'analyze:Analyze existing project'
            'upgrade:Upgrade project with new features'
            'commit:Auto-commit with AI message'
            'test:Generate and run tests'
            'document:Generate documentation'
            'optimize:Optimize performance'
            'fix:Fix linting and formatting'
        )
        _describe 'command' commands
    }
    
    compdef _claude_complete claude
    compdef _claude_complete cc
    compdef _claude_complete cca
fi

# ========================================
# INITIALIZATION
# ========================================

# Auto-load environment if .claude-auto file exists in directory
_claude_auto_check() {
    if [ -f ".claude-auto" ]; then
        claude-auto-on
        echo "Claude automation enabled (found .claude-auto file)"
    fi
}

# Add to shell hooks (for zsh)
if [ -n "$ZSH_VERSION" ]; then
    autoload -U add-zsh-hook
    add-zsh-hook chpwd _claude_auto_check
fi

# Check on shell startup
_claude_auto_check

# Show quick help on load
echo "Claude Code Auto Action loaded!"
echo "Quick commands:"
echo "  ccnew <name> <desc>  - Create new project"
echo "  cca <prompt>         - Run Claude with auto-approval"
echo "  claude-auto-on       - Enable full automation"
echo "  claude-status        - Check automation status"
echo "  claude-template list - Show project templates"
echo "Type 'claude-help' for full command list"