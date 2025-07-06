#!/bin/bash

# Cursor Auto-Edit Handler
# Comprehensive solution for automating Cursor edit confirmations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_CONFIG="$HOME/.claude/settings.json"
PID_FILE="/tmp/cursor-auto-edit.pid"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check if YOLO mode is enabled
is_yolo_mode() {
    if [ -f "$CLAUDE_CONFIG" ]; then
        yolo_mode=$(jq -r '.automation.yolo_mode // false' "$CLAUDE_CONFIG")
        [ "$yolo_mode" == "true" ]
    else
        return 1
    fi
}

# Function to start the AppleScript handler (macOS only)
start_applescript_handler() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${GREEN}Starting AppleScript dialog handler...${NC}"
        osascript "$SCRIPT_DIR/cursor-dialog-handler.applescript" > /dev/null 2>&1 &
        echo $! >> "$PID_FILE"
    fi
}

# Function to start the Python auto-save daemon
start_python_daemon() {
    echo -e "${GREEN}Starting Python auto-save daemon...${NC}"
    
    # Check if required Python packages are installed
    if ! python3 -c "import pyautogui, watchdog" 2>/dev/null; then
        echo -e "${YELLOW}Installing required Python packages...${NC}"
        pip3 install pyautogui watchdog pillow
    fi
    
    # Start the daemon
    if is_yolo_mode; then
        python3 "$SCRIPT_DIR/auto-save-daemon.py" --yolo &
    else
        python3 "$SCRIPT_DIR/auto-save-daemon.py" &
    fi
    
    echo $! >> "$PID_FILE"
}

# Function to enable VSCode/Cursor auto-save
enable_editor_autosave() {
    echo -e "${GREEN}Configuring editor auto-save...${NC}"
    
    # Try to set auto-save via command line
    code --install-extension formulahendry.auto-save 2>/dev/null || true
    
    # Update VSCode settings
    VSCODE_SETTINGS="$HOME/.config/Code/User/settings.json"
    CURSOR_SETTINGS="$HOME/.config/Cursor/User/settings.json"
    
    for settings_file in "$VSCODE_SETTINGS" "$CURSOR_SETTINGS"; do
        if [ -f "$settings_file" ]; then
            # Backup original settings
            cp "$settings_file" "${settings_file}.backup"
            
            # Add auto-save configuration
            jq '. + {
                "files.autoSave": "afterDelay",
                "files.autoSaveDelay": 1000,
                "editor.formatOnSave": true,
                "editor.formatOnPaste": true
            }' "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
            
            echo -e "${GREEN}Updated settings: $settings_file${NC}"
        fi
    done
}

# Function to stop all handlers
stop_handlers() {
    echo -e "${YELLOW}Stopping all handlers...${NC}"
    
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                echo "Stopped process: $pid"
            fi
        done < "$PID_FILE"
        
        rm -f "$PID_FILE"
    fi
    
    # Kill any remaining Python daemons
    pkill -f "auto-save-daemon.py" 2>/dev/null || true
    
    # Kill AppleScript processes
    pkill -f "cursor-dialog-handler.applescript" 2>/dev/null || true
}

# Function to show status
show_status() {
    echo -e "${GREEN}Cursor Auto-Edit Status:${NC}"
    
    if is_yolo_mode; then
        echo -e "Mode: ${YELLOW}YOLO (Full Automation)${NC}"
    else
        echo -e "Mode: ${GREEN}Normal${NC}"
    fi
    
    if [ -f "$PID_FILE" ]; then
        echo -e "\nRunning processes:"
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                echo "  PID $pid: $(ps -p "$pid" -o comm= 2>/dev/null || echo "Unknown")"
            fi
        done < "$PID_FILE"
    else
        echo -e "\n${YELLOW}No handlers running${NC}"
    fi
}

# Main command handler
case "${1:-help}" in
    start)
        stop_handlers  # Stop any existing handlers first
        
        echo -e "${GREEN}Starting Cursor auto-edit handlers...${NC}"
        
        # Create PID file
        touch "$PID_FILE"
        
        # Start handlers based on platform
        if [[ "$OSTYPE" == "darwin"* ]]; then
            start_applescript_handler
        fi
        
        start_python_daemon
        enable_editor_autosave
        
        echo -e "\n${GREEN}✓ Auto-edit handlers started!${NC}"
        echo -e "${YELLOW}Tip: Run '$0 status' to check handler status${NC}"
        ;;
        
    stop)
        stop_handlers
        echo -e "${GREEN}✓ All handlers stopped${NC}"
        ;;
        
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
        
    status)
        show_status
        ;;
        
    yolo)
        # Enable YOLO mode
        echo -e "${YELLOW}Enabling YOLO mode...${NC}"
        
        if [ -f "$CLAUDE_CONFIG" ]; then
            jq '.automation.yolo_mode = true' "$CLAUDE_CONFIG" > "${CLAUDE_CONFIG}.tmp" && \
            mv "${CLAUDE_CONFIG}.tmp" "$CLAUDE_CONFIG"
        else
            mkdir -p "$(dirname "$CLAUDE_CONFIG")"
            echo '{"automation": {"yolo_mode": true}}' > "$CLAUDE_CONFIG"
        fi
        
        echo -e "${GREEN}✓ YOLO mode enabled!${NC}"
        echo -e "${YELLOW}Restarting handlers...${NC}"
        $0 restart
        ;;
        
    safe)
        # Disable YOLO mode
        echo -e "${GREEN}Enabling safe mode...${NC}"
        
        if [ -f "$CLAUDE_CONFIG" ]; then
            jq '.automation.yolo_mode = false' "$CLAUDE_CONFIG" > "${CLAUDE_CONFIG}.tmp" && \
            mv "${CLAUDE_CONFIG}.tmp" "$CLAUDE_CONFIG"
        fi
        
        echo -e "${GREEN}✓ Safe mode enabled${NC}"
        echo -e "${YELLOW}Restarting handlers...${NC}"
        $0 restart
        ;;
        
    test)
        # Test dialog handling
        echo -e "${GREEN}Testing dialog handling...${NC}"
        echo "This will simulate a dialog in 5 seconds. Switch to Cursor!"
        sleep 5
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            osascript -e 'tell application "System Events" to key code 36' # Press Enter
        else
            python3 -c "import pyautogui; pyautogui.press('enter')"
        fi
        
        echo -e "${GREEN}✓ Test completed${NC}"
        ;;
        
    *)
        echo "Cursor Auto-Edit Handler"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|yolo|safe|test}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all auto-edit handlers"
        echo "  stop     - Stop all handlers"
        echo "  restart  - Restart all handlers"
        echo "  status   - Show current status"
        echo "  yolo     - Enable YOLO mode (auto-confirm everything)"
        echo "  safe     - Enable safe mode (manual confirmations)"
        echo "  test     - Test dialog handling"
        echo ""
        echo "Examples:"
        echo "  $0 start      # Start handlers"
        echo "  $0 yolo       # Enable YOLO mode and restart"
        echo "  $0 status     # Check handler status"
        ;;
esac