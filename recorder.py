import time
import os
import shutil
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# --- CONFIGURATION ---
SOURCE_FILE = "timing_data.txt"
HISTORY_DIR = "./history"

class BackupHandler(FileSystemEventHandler):
    def on_modified(self, event):
        # Watchdog monitors the directory, so we filter for our specific file
        if event.src_path.endswith(SOURCE_FILE):
            self.create_backup()

    def create_backup(self):
        try:
            # Create history dir if missing
            if not os.path.exists(HISTORY_DIR):
                os.makedirs(HISTORY_DIR)

            # Generate a unique filename using a timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = os.path.basename(SOURCE_FILE)
            name, ext = os.path.splitext(filename)
            backup_name = f"{name}_{timestamp}{ext}"
            dest_path = os.path.join(HISTORY_DIR, backup_name)

            # Perform the copy
            shutil.copy2(SOURCE_FILE, dest_path)
            print(f"[*] Backup created: {dest_path}")
            
        except Exception as e:
            print(f"[!] Error during backup: {e}")

if __name__ == "__main__":
    # Ensure the source file actually exists before starting
    if not os.path.exists(SOURCE_FILE):
        with open(SOURCE_FILE, 'w') as f:
            f.write("Initial state")
        print(f"Created initial {SOURCE_FILE}")

    event_handler = BackupHandler()
    observer = Observer()
    # We watch the current directory ('.')
    observer.schedule(event_handler, path='.', recursive=False)
    
    print(f"Monitoring {SOURCE_FILE} for changes... (Ctrl+C to stop)")
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()