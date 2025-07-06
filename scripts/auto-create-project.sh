#!/bin/bash
# Claude Code Auto Project Creator
# Fully automated project creation with zero prompts

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Source automation environment
if [ -f ~/.claude-auto-env ]; then
    source ~/.claude-auto-env
else
    # Set inline if env file doesn't exist
    export CLAUDE_AUTO_APPROVE=true
    export CLAUDE_SKIP_CONFIRMATION=true
    export CLAUDE_NON_INTERACTIVE=true
    export CLAUDE_PERMISSIONS_MODE=bypassPermissions
    export CLAUDE_AUTO_CREATE_DIRECTORIES=true
    export CLAUDE_AUTO_CREATE_FILES=true
    export CLAUDE_AUTO_INITIALIZE_GIT=true
    export CLAUDE_AUTO_INSTALL_DEPENDENCIES=true
fi

# Usage function
usage() {
    echo -e "${BLUE}Claude Auto Project Creator${NC}"
    echo ""
    echo "Usage: $0 <project-name> [options]"
    echo ""
    echo "Options:"
    echo "  -t, --type <type>        Project type (web, api, cli, mobile, desktop, fullstack)"
    echo "  -s, --stack <stack>      Tech stack (e.g., 'react,node,postgres')"
    echo "  -d, --description <desc> Project description"
    echo "  -f, --features <list>    Comma-separated features"
    echo "  --template <name>        Use predefined template"
    echo "  --no-install            Skip dependency installation"
    echo "  --no-git                Skip git initialization"
    echo "  --no-docker             Skip Docker setup"
    echo "  --no-tests              Skip test setup"
    echo ""
    echo "Examples:"
    echo "  $0 my-app -t web -d 'E-commerce platform'"
    echo "  $0 my-api -t api -s 'node,express,postgres' -f 'auth,crud,docs'"
    echo "  $0 my-saas --template saas"
    echo ""
    echo "Templates:"
    echo "  saas         - Multi-tenant SaaS with billing"
    echo "  marketplace  - Two-sided marketplace"
    echo "  ecommerce    - Online store with payments"
    echo "  social       - Social media platform"
    echo "  blog         - Blog/CMS system"
    echo "  dashboard    - Analytics dashboard"
    echo "  microservice - Microservices architecture"
    exit 1
}

# Parse arguments
PROJECT_NAME=""
PROJECT_TYPE="auto"
TECH_STACK="auto"
DESCRIPTION=""
FEATURES=""
TEMPLATE=""
SKIP_INSTALL=false
SKIP_GIT=false
SKIP_DOCKER=false
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            PROJECT_TYPE="$2"
            shift 2
            ;;
        -s|--stack)
            TECH_STACK="$2"
            shift 2
            ;;
        -d|--description)
            DESCRIPTION="$2"
            shift 2
            ;;
        -f|--features)
            FEATURES="$2"
            shift 2
            ;;
        --template)
            TEMPLATE="$2"
            shift 2
            ;;
        --no-install)
            SKIP_INSTALL=true
            shift
            ;;
        --no-git)
            SKIP_GIT=true
            shift
            ;;
        --no-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --no-tests)
            SKIP_TESTS=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            if [ -z "$PROJECT_NAME" ]; then
                PROJECT_NAME="$1"
            else
                echo -e "${RED}Unknown option: $1${NC}"
                usage
            fi
            shift
            ;;
    esac
done

# Validate project name
if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Project name is required${NC}"
    usage
fi

# Apply template if specified
if [ -n "$TEMPLATE" ]; then
    case "$TEMPLATE" in
        saas)
            PROJECT_TYPE="fullstack"
            DESCRIPTION="Multi-tenant SaaS application with subscription billing"
            FEATURES="auth,multi-tenant,billing,admin,api,dashboard"
            TECH_STACK="react,typescript,node,express,postgres,redis,stripe"
            ;;
        marketplace)
            PROJECT_TYPE="fullstack"
            DESCRIPTION="Two-sided marketplace platform"
            FEATURES="auth,listings,search,payments,reviews,messaging"
            TECH_STACK="nextjs,typescript,node,postgres,elasticsearch,stripe"
            ;;
        ecommerce)
            PROJECT_TYPE="fullstack"
            DESCRIPTION="E-commerce platform with shopping cart and payments"
            FEATURES="products,cart,checkout,payments,inventory,admin"
            TECH_STACK="react,node,express,mongodb,stripe,redis"
            ;;
        social)
            PROJECT_TYPE="fullstack"
            DESCRIPTION="Social media platform with real-time features"
            FEATURES="auth,posts,comments,likes,follow,realtime,notifications"
            TECH_STACK="react,node,socket.io,mongodb,redis"
            ;;
        blog)
            PROJECT_TYPE="fullstack"
            DESCRIPTION="Blog platform with CMS"
            FEATURES="posts,comments,tags,search,admin,seo,rss"
            TECH_STACK="nextjs,typescript,node,postgres,markdown"
            ;;
        dashboard)
            PROJECT_TYPE="web"
            DESCRIPTION="Analytics dashboard with data visualization"
            FEATURES="charts,reports,exports,realtime,filters"
            TECH_STACK="react,typescript,d3,node,postgres"
            ;;
        microservice)
            PROJECT_TYPE="api"
            DESCRIPTION="Microservices architecture with API gateway"
            FEATURES="gateway,auth-service,api-service,queue,cache"
            TECH_STACK="node,express,postgres,redis,rabbitmq,docker"
            ;;
        *)
            echo -e "${RED}Unknown template: $TEMPLATE${NC}"
            exit 1
            ;;
    esac
fi

# Create comprehensive project prompt
create_project_prompt() {
    local prompt="Create a complete production-ready project with the following specifications:\n\n"
    
    prompt+="PROJECT DETAILS:\n"
    prompt+="- Name: $PROJECT_NAME\n"
    prompt+="- Type: $PROJECT_TYPE\n"
    
    if [ -n "$DESCRIPTION" ]; then
        prompt+="- Description: $DESCRIPTION\n"
    fi
    
    if [ "$TECH_STACK" != "auto" ]; then
        prompt+="- Tech Stack: $TECH_STACK\n"
    fi
    
    if [ -n "$FEATURES" ]; then
        prompt+="- Features: $FEATURES\n"
    fi
    
    prompt+="\nREQUIREMENTS:\n"
    prompt+="1. Create complete project structure with all necessary directories\n"
    prompt+="2. Implement all specified features with production-quality code\n"
    prompt+="3. Set up comprehensive testing (unit, integration, e2e)\n"
    prompt+="4. Create detailed documentation (README, API docs, architecture)\n"
    prompt+="5. Configure development environment (ESLint, Prettier, Git hooks)\n"
    prompt+="6. Set up CI/CD pipeline (GitHub Actions or GitLab CI)\n"
    prompt+="7. Create Docker configuration for local development and production\n"
    prompt+="8. Implement security best practices (authentication, validation, CORS)\n"
    prompt+="9. Add error handling, logging, and monitoring setup\n"
    prompt+="10. Create deployment configurations (Vercel, Heroku, AWS, etc.)\n"
    
    prompt+="\nADDITIONAL REQUIREMENTS:\n"
    prompt+="- Use TypeScript if applicable\n"
    prompt+="- Implement proper error boundaries and fallbacks\n"
    prompt+="- Add internationalization support if it's a user-facing app\n"
    prompt+="- Include performance optimizations\n"
    prompt+="- Create seed data and migration scripts\n"
    prompt+="- Add health check endpoints\n"
    prompt+="- Implement rate limiting and security headers\n"
    prompt+="- Create comprehensive .env.example file\n"
    prompt+="- Add pre-commit hooks for code quality\n"
    prompt+="- Include API versioning if applicable\n"
    prompt+="- Create both development and production configurations\n"
    
    if [ "$SKIP_INSTALL" = false ]; then
        prompt+="\nAfter creating all files, install all dependencies.\n"
    fi
    
    if [ "$SKIP_GIT" = false ]; then
        prompt+="\nInitialize git repository and create initial commit.\n"
    fi
    
    echo -e "$prompt"
}

# Main execution
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}     Claude Auto Project Creator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Creating project: ${NC}$PROJECT_NAME"

# Check if directory already exists
if [ -d "$PROJECT_NAME" ]; then
    echo -e "${RED}Error: Directory '$PROJECT_NAME' already exists${NC}"
    exit 1
fi

# Create project directory
echo -e "${YELLOW}Creating project directory...${NC}"
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Create initial structure
mkdir -p .claude/{logs,workspace,cache}

# Generate project creation prompt
PROMPT=$(create_project_prompt)

# Create prompt file for reference
echo -e "$PROMPT" > .claude/creation-prompt.md

# Execute Claude with full automation
echo -e "${YELLOW}Generating project with Claude...${NC}"
echo -e "${BLUE}This may take a few minutes...${NC}"

# Run Claude with all automation flags
claude \
    --dangerously-skip-permissions \
    --non-interactive \
    --auto-approve \
    --batch-mode \
    "$PROMPT" 2>&1 | tee .claude/logs/creation.log

# Post-creation tasks
echo -e "\n${YELLOW}Running post-creation tasks...${NC}"

# Create quick start script
cat > quickstart.sh << 'EOF'
#!/bin/bash
# Quick start script for this project

echo "Setting up project..."

# Install dependencies
if [ -f "package.json" ]; then
    npm install
elif [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
elif [ -f "Gemfile" ]; then
    bundle install
fi

# Copy environment file
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created .env file - please update with your values"
fi

# Run database setup
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d db redis
    sleep 5
fi

# Run migrations
if [ -f "package.json" ] && grep -q "migrate" package.json; then
    npm run migrate
elif [ -f "manage.py" ]; then
    python manage.py migrate
fi

# Seed database
if [ -f "package.json" ] && grep -q "seed" package.json; then
    npm run seed
fi

echo "Setup complete! Check README.md for next steps."
EOF

chmod +x quickstart.sh

# Create automation marker
touch .claude-auto

# Final summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ PROJECT CREATED SUCCESSFULLY! ✨${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Project Details:${NC}"
echo "- Name: $PROJECT_NAME"
echo "- Location: $(pwd)"
echo "- Type: $PROJECT_TYPE"
if [ -n "$DESCRIPTION" ]; then
    echo "- Description: $DESCRIPTION"
fi
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "1. cd $PROJECT_NAME"
echo "2. Review the generated code and documentation"
echo "3. Run ./quickstart.sh for automatic setup"
echo "4. Check README.md for detailed instructions"
echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo "- Start development: npm run dev (or check package.json)"
echo "- Run tests: npm test"
echo "- Build project: npm run build"
echo "- View docs: open docs/index.html"
echo ""

# Show file tree
if command -v tree &> /dev/null; then
    echo -e "${CYAN}Project Structure:${NC}"
    tree -L 2 -a -I 'node_modules|.git'
else
    echo -e "${CYAN}Main directories created:${NC}"
    ls -la
fi

echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"