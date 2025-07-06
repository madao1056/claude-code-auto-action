#!/usr/bin/osascript
(*
Cursor Dialog Handler - AppleScript for automatically handling Cursor confirmation dialogs
*)

on run
    -- Main loop to monitor and handle dialogs
    repeat
        try
            handleCursorDialogs()
            delay 0.5
        on error errMsg
            log "Error: " & errMsg
        end try
    end repeat
end run

on handleCursorDialogs()
    tell application "System Events"
        -- Check if Cursor is running
        if not (exists process "Cursor") then
            return
        end if
        
        tell process "Cursor"
            -- Get all windows
            set cursorWindows to every window
            
            repeat with aWindow in cursorWindows
                -- Check for dialog windows
                if exists sheet 1 of aWindow then
                    set dialogSheet to sheet 1 of aWindow
                    handleDialog(dialogSheet)
                end if
                
                -- Check for floating dialogs
                if (count of buttons of aWindow) > 0 then
                    handleWindowDialog(aWindow)
                end if
            end repeat
        end tell
    end tell
end handleCursorDialogs

on handleDialog(dialogElement)
    tell application "System Events"
        tell process "Cursor"
            -- Get dialog text if available
            set dialogText to ""
            try
                set dialogText to value of static text 1 of dialogElement
            end try
            
            -- Check if this is an edit confirmation dialog
            if dialogText contains "Do you want to make this edit" or ¬
               dialogText contains "Save file to continue" or ¬
               dialogText contains "Apply these changes" or ¬
               dialogText contains "Confirm" then
                
                -- Look for positive response buttons
                set buttonList to {"Yes", "OK", "Save", "Apply", "Continue", "Confirm"}
                
                repeat with buttonName in buttonList
                    try
                        click button buttonName of dialogElement
                        log "Clicked " & buttonName & " button"
                        return
                    end try
                end repeat
                
                -- If no specific button found, click the first button
                try
                    click button 1 of dialogElement
                    log "Clicked default button"
                end try
            end if
        end tell
    end tell
end handleDialog

on handleWindowDialog(windowElement)
    tell application "System Events"
        tell process "Cursor"
            -- Check if window has buttons indicating a dialog
            set buttonCount to count of buttons of windowElement
            
            if buttonCount > 0 and buttonCount < 5 then
                -- Likely a dialog window
                repeat with i from 1 to buttonCount
                    set buttonTitle to title of button i of windowElement
                    
                    -- Click positive response buttons
                    if buttonTitle is in {"Yes", "OK", "Save", "Apply", "Continue"} then
                        click button i of windowElement
                        log "Clicked " & buttonTitle & " in window dialog"
                        return
                    end if
                end repeat
            end if
        end tell
    end tell
end handleWindowDialog

-- Function to start the handler in background
on startInBackground()
    do shell script "osascript " & quoted form of (POSIX path of (path to me)) & " > /dev/null 2>&1 &"
end startInBackground