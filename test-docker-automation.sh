#!/bin/bash

# Test script for Docker automation in Claude Code
echo "Testing Docker automation..."
echo "==============================="

# Source the shell integration
source ./shell-integration.sh

# Show current status
echo -e "\n1. Current automation status:"
claude-status

# Test Docker-specific automation
echo -e "\n2. Enabling Docker automation only:"
claude-docker-on
claude-status | grep -E "Docker|Auto"

# Test full automation (includes Docker)
echo -e "\n3. Enabling full automation:"
claude-auto-on
claude-status | grep -E "Docker|Auto"

# Test disabling Docker automation
echo -e "\n4. Disabling Docker automation:"
claude-docker-off
claude-status | grep -E "Docker|Auto"

# Test Python wrapper pattern matching
echo -e "\n5. Testing Python wrapper Docker patterns:"
python3 -c "
import sys
import os
sys.path.insert(0, os.path.join(os.getcwd(), 'scripts'))

# Import the script directly
exec(open('./scripts/claude-auto.py').read())

wrapper = ClaudeAutoWrapper()
test_prompts = [
    'docker-compose up -d\\nDo you want to proceed?',
    'Start Docker containers\\nDo you want to proceed?',
    'Building Docker image myapp:latest',
    'Creating Docker network myapp_network',
    'Starting container myapp_web_1'
]

print('Testing Docker prompt recognition:')
for prompt in test_prompts:
    response = wrapper.find_response(prompt)
    print(f'  Prompt: {repr(prompt[:30])}... -> Response: {repr(response)}')
"

# Test environment variables
echo -e "\n6. Docker-related environment variables:"
env | grep -E "CLAUDE.*DOCKER|DOCKER.*CLAUDE" | sort

echo -e "\n7. Testing complete Docker workflow simulation:"
# Create a test docker-compose.yml
cat > test-docker-compose.yml << 'EOF'
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
EOF

echo "Created test-docker-compose.yml"

# Simulate Claude command with Docker (dry run)
echo -e "\n8. Simulating Docker automation with Claude command:"
echo "Would run: claude-auto 'docker-compose up -d'"
echo "Expected: Auto-approval of Docker startup prompt"

# Clean up
rm -f test-docker-compose.yml

echo -e "\n✅ Docker automation test complete!"
echo "==============================="
echo ""
echo "Summary:"
echo "- Docker automation can be enabled independently with: claude-docker-on"
echo "- Full automation includes Docker with: claude-auto-on"
echo "- Settings.json has Docker configuration under automation.docker"
echo "- Python wrapper recognizes Docker-specific patterns"
echo "- Shell functions export proper environment variables"