#!/bin/bash
# Claude Auto Wrapper - Automatically responds to all prompts

# Source automation environment
[ -f ~/.claude-auto-env ] && source ~/.claude-auto-env

# Create expect script for automatic responses
cat > /tmp/claude-auto-expect.exp << 'EOF'
#!/usr/bin/expect -f
set timeout -1

# Get command arguments
set cmd [lindex $argv 0]
set args [lrange $argv 1 end]

# Spawn Claude with all arguments
spawn claude {*}$args

# Auto-respond to all known prompts
expect {
    -re "Do you want to proceed.*" {
        send "yes\r"
        exp_continue
    }
    -re "Do you want to make this edit.*" {
        send "yes\r"
        exp_continue
    }
    -re "Save file to continue.*" {
        send "\r"
        exp_continue
    }
    -re "Opened changes in Cursor.*" {
        send "\r"
        exp_continue
    }
    -re "Bash command.*Do you want to proceed.*" {
        send "yes\r"
        exp_continue
    }
    -re "Are you sure.*" {
        send "yes\r"
        exp_continue
    }
    -re "Continue\\?" {
        send "yes\r"
        exp_continue
    }
    -re "Confirm.*" {
        send "yes\r"
        exp_continue
    }
    -re "Overwrite.*" {
        send "yes\r"
        exp_continue
    }
    -re "\\(Y/n\\)" {
        send "Y\r"
        exp_continue
    }
    -re "\\(y/N\\)" {
        send "y\r"
        exp_continue
    }
    -re "yes/no" {
        send "yes\r"
        exp_continue
    }
    -re "Press.*to continue" {
        send "\r"
        exp_continue
    }
    -re "Enter to continue" {
        send "\r"
        exp_continue
    }
    eof
}
EOF

# Make expect script executable
chmod +x /tmp/claude-auto-expect.exp

# Check if expect is installed
if ! command -v expect &> /dev/null; then
    echo "Installing expect..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install expect
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y expect || sudo yum install -y expect
    fi
fi

# Run Claude through expect with automatic responses
if command -v expect &> /dev/null; then
    expect /tmp/claude-auto-expect.exp claude "$@"
else
    # Fallback: Use yes command to pipe responses
    yes | claude --dangerously-skip-permissions --non-interactive --auto-approve "$@"
fi

# Clean up
rm -f /tmp/claude-auto-expect.exp