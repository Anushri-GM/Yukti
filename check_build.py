import subprocess
import os

frontend_path = r"c:\Users\anush\OneDrive\Desktop\Projects\Yukti\Yukti\frontend"
log_path = r"c:\Users\anush\OneDrive\Desktop\Projects\Yukti\Yukti\build_log.txt"

print("Starting diagnostics build...")
res = subprocess.run(["npm.cmd", "run", "build"], cwd=frontend_path, capture_output=True, text=True)

with open(log_path, "w") as f:
    f.write("Exit Code: " + str(res.returncode) + "\n\n")
    f.write("STDOUT:\n" + res.stdout + "\n\n")
    f.write("STDERR:\n" + res.stderr + "\n")

print("Diagnostics completed. Log written to:", log_path)
