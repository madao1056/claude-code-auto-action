#!/usr/bin/env python3
"""
Claude Auto Wrapper - Automatically handles all interactive prompts
"""

import subprocess
import sys
import os
import select
import time
import re
from threading import Thread
from queue import Queue

class ClaudeAutoWrapper:
    def __init__(self):
        # Set environment variables
        self.setup_environment()
        
        # Define auto-response patterns
        self.response_patterns = [
            (r"Do you want to proceed\?", "yes"),
            (r"Do you want to make this edit", "yes"),
            (r"Save file to continue", "\n"),
            (r"Opened changes in Cursor", "\n"),
            (r"Bash command.*Do you want to proceed", "yes"),
            (r"Are you sure", "yes"),
            (r"Continue\?", "yes"),
            (r"Confirm", "yes"),
            (r"Overwrite", "yes"),
            (r"\(Y/n\)", "Y"),
            (r"\(y/N\)", "y"),
            (r"yes/no", "yes"),
            (r"Press.*to continue", "\n"),
            (r"Enter to continue", "\n"),
            (r"Would you like to", "yes"),
            (r"Create.*\?", "yes"),
            (r"Install.*\?", "yes"),
            (r"Execute.*\?", "yes"),
            (r"Run.*\?", "yes"),
            (r"Apply.*\?", "yes"),
            (r"Update.*\?", "yes"),
            (r"Delete.*\?", "yes"),
            (r"Remove.*\?", "yes"),
        ]
        
    def setup_environment(self):
        """Set all automation environment variables"""
        env_vars = {
            "CLAUDE_AUTO_APPROVE": "true",
            "CLAUDE_SKIP_CONFIRMATION": "true",
            "CLAUDE_NON_INTERACTIVE": "true",
            "CLAUDE_BATCH_MODE": "true",
            "CLAUDE_YES_TO_ALL": "true",
            "CLAUDE_PERMISSIONS_MODE": "bypassPermissions",
            "CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS": "true",
            "CLAUDE_AUTO_EXECUTE_COMMANDS": "true",
            "CLAUDE_AUTO_SAVE_FILES": "true",
            "CLAUDE_SKIP_EDITOR_PROMPTS": "true",
        }
        
        for key, value in env_vars.items():
            os.environ[key] = value
    
    def find_response(self, text):
        """Find appropriate response for given text"""
        for pattern, response in self.response_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return response
        return "yes"  # Default response
    
    def run_claude(self, args):
        """Run Claude with automatic responses to prompts"""
        # Build command
        cmd = ["claude", "--dangerously-skip-permissions", "--non-interactive"] + args
        
        # Start process with pipes
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Queue for output
        output_queue = Queue()
        
        def read_output(pipe, queue):
            """Read output from pipe and put in queue"""
            try:
                for line in iter(pipe.readline, ''):
                    if line:
                        queue.put(line)
                        print(line, end='', flush=True)
            except:
                pass
            finally:
                pipe.close()
        
        # Start threads to read output
        stdout_thread = Thread(target=read_output, args=(process.stdout, output_queue))
        stderr_thread = Thread(target=read_output, args=(process.stderr, output_queue))
        stdout_thread.daemon = True
        stderr_thread.daemon = True
        stdout_thread.start()
        stderr_thread.start()
        
        # Buffer for collecting output
        buffer = ""
        last_response_time = 0
        
        try:
            while process.poll() is None:
                # Check for output
                try:
                    while not output_queue.empty():
                        line = output_queue.get_nowait()
                        buffer += line
                        
                        # Check if we need to respond
                        response = self.find_response(buffer)
                        if response and time.time() - last_response_time > 0.1:
                            # Send response
                            process.stdin.write(response + "\n")
                            process.stdin.flush()
                            last_response_time = time.time()
                            buffer = ""  # Clear buffer after responding
                except:
                    pass
                
                # Small delay to prevent CPU spinning
                time.sleep(0.01)
            
            # Wait for threads to finish
            stdout_thread.join(timeout=1)
            stderr_thread.join(timeout=1)
            
        except KeyboardInterrupt:
            process.terminate()
            return 1
        
        return process.returncode

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: claude-auto <claude arguments>")
        print("Example: claude-auto 'Create a new React app'")
        sys.exit(1)
    
    # Create wrapper and run
    wrapper = ClaudeAutoWrapper()
    exit_code = wrapper.run_claude(sys.argv[1:])
    sys.exit(exit_code)

if __name__ == "__main__":
    main()