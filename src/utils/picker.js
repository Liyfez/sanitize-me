import { execFile, exec } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Open native OS file picker dialog without external dependencies.
 * @returns {Promise<string | null>} Selected absolute file path or null if cancelled.
 */
export function openFilePicker() {
  const currentPlatform = platform();

  return new Promise((resolve) => {
    if (currentPlatform === 'win32') {
      const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = "Select file to sanitize"
$dialog.Filter = "Supported Files (*.jpg, *.png, *.webp, *.pdf, *.txt, *.log)|*.jpg;*.jpeg;*.png;*.webp;*.pdf;*.txt;*.log;*.json;*.env;*.csv|All Files (*.*)|*.*"
$dialog.InitialDirectory = [Environment]::GetFolderPath("Desktop")
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.FileName
}
`;
      // Pass base64 encoded command to avoid escaping issues
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
      execFile('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    } else if (currentPlatform === 'darwin') {
      const script = 'POSIX path of (choose file with prompt "Select file to sanitize")';
      execFile('osascript', ['-e', script], (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    } else {
      // Linux: try zenity then kdialog
      exec('zenity --file-selection --title="Select file to sanitize" 2>/dev/null', (err, stdout) => {
        if (!err && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          exec('kdialog --getopenfilename . 2>/dev/null', (kErr, kStdout) => {
            if (!kErr && kStdout.trim()) {
              resolve(kStdout.trim());
            } else {
              resolve(null);
            }
          });
        }
      });
    }
  });
}
