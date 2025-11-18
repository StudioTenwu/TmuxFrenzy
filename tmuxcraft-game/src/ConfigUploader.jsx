import { useState } from 'react';
import './ConfigUploader.css';

function ConfigUploader({ onKeybindingsUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const content = await file.text();

      const response = await fetch('http://localhost:3001/api/parse-tmux-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configContent: content }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse config');
      }

      const data = await response.json();
      onKeybindingsUpdate(data.keybindings);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="config-uploader">
      <label htmlFor="tmux-config" className="upload-label">
        Upload tmux config
      </label>
      <input
        id="tmux-config"
        type="file"
        accept=".conf,.config,.txt"
        onChange={handleFileUpload}
        disabled={uploading}
        className="upload-input"
      />
      {uploading && <div className="upload-status">Parsing config...</div>}
      {success && <div className="upload-success">Controls updated!</div>}
      {error && <div className="upload-error">Error: {error}</div>}
    </div>
  );
}

export default ConfigUploader;
