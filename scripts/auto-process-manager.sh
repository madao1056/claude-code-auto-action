#!/bin/bash

# Auto Process Manager - Handles process kills and restarts without prompts

# Function to kill process on port without confirmation
kill_port() {
    local port=$1
    echo "🔄 Killing process on port $port..."
    
    # Kill without prompting
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    
    # Double check with SIGKILL
    fuser -k $port/tcp 2>/dev/null || true
    
    # Wait for port to be released
    sleep 1
    
    echo "✓ Port $port cleared"
}

# Function to restart a service
restart_service() {
    local port=$1
    local command=$2
    
    # Kill existing process
    kill_port $port
    
    # Start new process in background
    echo "🚀 Starting: $command"
    nohup bash -c "$command" > /tmp/service_$port.log 2>&1 &
    
    echo "✓ Service restarted on port $port (PID: $!)"
}

# Function to handle common restart scenarios
auto_restart() {
    case "$1" in
        node|npm)
            # Find package.json and determine port
            if [ -f "package.json" ]; then
                # Try to extract port from common locations
                local port=$(grep -E '"port":|PORT=|:3[0-9]{3}|:8[0-9]{3}' package.json .env* 2>/dev/null | grep -oE '[0-9]{4}' | head -1)
                port=${port:-3000}  # Default to 3000
                
                kill_port $port
                
                # Determine start command
                if grep -q '"dev":' package.json; then
                    npm run dev &
                elif grep -q '"start":' package.json; then
                    npm start &
                else
                    node server.js &
                fi
            fi
            ;;
        python)
            # Common Python ports
            for port in 8000 8080 5000; do
                kill_port $port
            done
            
            if [ -f "manage.py" ]; then
                python manage.py runserver &
            elif [ -f "app.py" ]; then
                python app.py &
            fi
            ;;
        *)
            echo "Usage: auto_restart [node|npm|python]"
            ;;
    esac
}

# Export functions for use in other scripts
export -f kill_port
export -f restart_service
export -f auto_restart

# If called with arguments, execute the command
if [ $# -gt 0 ]; then
    case "$1" in
        kill)
            kill_port $2
            ;;
        restart)
            restart_service $2 "$3"
            ;;
        auto)
            auto_restart $2
            ;;
        *)
            echo "Commands:"
            echo "  kill <port>           - Kill process on port"
            echo "  restart <port> <cmd>  - Restart service"
            echo "  auto <type>          - Auto restart (node/python)"
            ;;
    esac
fi