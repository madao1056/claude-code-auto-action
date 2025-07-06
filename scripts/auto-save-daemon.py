#!/usr/bin/env python3
"""
Auto-save daemon for Cursor/VSCode
Monitors file changes and automatically saves without confirmation dialogs
"""

import os
import sys
import time
import json
import subprocess
import pyautogui
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pathlib import Path

class AutoSaveHandler(FileSystemEventHandler):
    def __init__(self, config_path):
        self.config = self.load_config(config_path)
        self.pending_saves = set()
        self.last_save_time = {}
        
        # Configure pyautogui for safety
        pyautogui.PAUSE = 0.1
        pyautogui.FAILSAFE = True
        
    def load_config(self, config_path):
        """Load configuration from Claude settings"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except:
            return {
                'automation': {
                    'auto_save': True,
                    'save_delay': 1.0,
                    'yolo_mode': False
                }
            }
    
    def on_modified(self, event):
        """Handle file modification events"""
        if event.is_directory:
            return
            
        # Skip certain files
        if any(pattern in event.src_path for pattern in ['.git', 'node_modules', '.pyc', '__pycache__']):
            return
            
        # Add to pending saves
        self.pending_saves.add(event.src_path)
        
        # Check if we should auto-save
        if self.should_auto_save(event.src_path):
            self.schedule_save(event.src_path)
    
    def should_auto_save(self, file_path):
        """Check if file should be auto-saved"""
        # Check if enough time has passed since last save
        last_save = self.last_save_time.get(file_path, 0)
        save_delay = self.config.get('automation', {}).get('save_delay', 1.0)
        
        return time.time() - last_save > save_delay
    
    def schedule_save(self, file_path):
        """Schedule a save operation"""
        time.sleep(0.5)  # Brief delay to let editor finish
        
        # Try to save using VSCode/Cursor command
        try:
            # First, try using code command
            subprocess.run(['code', '--command', 'workbench.action.files.save'], check=False)
        except:
            # Fallback to keyboard shortcut
            self.send_save_keystroke()
        
        self.last_save_time[file_path] = time.time()
        self.pending_saves.discard(file_path)
        
    def send_save_keystroke(self):
        """Send Cmd+S (or Ctrl+S) to save current file"""
        if sys.platform == 'darwin':
            pyautogui.hotkey('cmd', 's')
        else:
            pyautogui.hotkey('ctrl', 's')
    
    def handle_dialog_if_present(self):
        """Check for and handle any dialog boxes"""
        # Look for common dialog patterns
        dialog_patterns = [
            "Do you want to make this edit",
            "Save file to continue",
            "Opened changes in Cursor"
        ]
        
        # Try to find and click confirmation buttons
        try:
            # Look for Yes/OK/Save buttons
            for button_text in ['Yes', 'OK', 'Save', 'Apply', 'Continue']:
                button = pyautogui.locateOnScreen(f'buttons/{button_text.lower()}.png', confidence=0.8)
                if button:
                    pyautogui.click(button)
                    print(f"Clicked {button_text} button")
                    return True
                    
            # Alternative: just press Enter for default action
            pyautogui.press('enter')
            
        except Exception as e:
            print(f"Error handling dialog: {e}")
            
        return False

class CursorAutoSave:
    def __init__(self):
        self.config_path = os.path.expanduser('~/.claude/settings.json')
        self.observer = Observer()
        self.handler = AutoSaveHandler(self.config_path)
        
    def start(self, watch_path='.'):
        """Start the file watcher"""
        print(f"Starting auto-save daemon for: {watch_path}")
        print("Press Ctrl+C to stop")
        
        self.observer.schedule(self.handler, watch_path, recursive=True)
        self.observer.start()
        
        try:
            while True:
                # Periodically check for dialogs
                self.handler.handle_dialog_if_present()
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\nStopping auto-save daemon...")
            self.observer.stop()
            
        self.observer.join()
        print("Auto-save daemon stopped")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Auto-save daemon for Cursor/VSCode')
    parser.add_argument('path', nargs='?', default='.', help='Path to watch (default: current directory)')
    parser.add_argument('--yolo', action='store_true', help='Enable YOLO mode (auto-confirm everything)')
    
    args = parser.parse_args()
    
    # Set YOLO mode if requested
    if args.yolo:
        os.environ['CLAUDE_YOLO_MODE'] = 'true'
        print("⚠️  YOLO mode enabled - all confirmations will be automatic!")
    
    daemon = CursorAutoSave()
    daemon.start(args.path)

if __name__ == '__main__':
    main()