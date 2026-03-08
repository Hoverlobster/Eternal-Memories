import React, { useState } from 'react';
import './MemoriesPage.css';

export default function MemoriesPage({ mode, setScreen, memories, setSelectedMemory, uploadMemory }) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCaption('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !caption.trim()) {
      alert('Please add a caption!');
      return;
    }

    setUploading(true);
    const success = await uploadMemory(selectedFile, caption);
    setUploading(false);

    if (success) {
      setSelectedFile(null);
      setCaption('');
      const input = document.getElementById('file-input');
      if (input) input.value = '';
    } else {
      alert('Failed to upload memory');
    }
  };

  const handleMemoryClick = (memory) => {
    setSelectedMemory(memory);
    setScreen('detail');
  };

  return (
    <div className={`memories-page ${mode}`}>
      <div className="memories-header">
        <button onClick={() => setScreen('main')} className="back-btn">
          ← Back
        </button>
        <h2>Us, eternally 🫂</h2>
      </div>

      <div className="memories-container">
        <div className="upload-section">
          <div className="upload-box">
            {selectedFile ? (
              <>
                <div className="file-preview">
                  {selectedFile.type.startsWith('video') ? (
                    <div className="video-icon">🎬</div>
                  ) : (
                    <div className="image-icon">🖼️</div>
                  )}
                  <p>{selectedFile.name}</p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden-input"
                />
                <button
                  onClick={() => document.getElementById('file-input').click()}
                  className="btn-change"
                >
                  Change File
                </button>
              </>
            ) : (
              <>
                <div className="upload-icon">➕</div>
                <p>Click to add memory</p>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden-input"
                />
                <button
                  onClick={() => document.getElementById('file-input').click()}
                  className="btn-upload"
                >
                  Choose File
                </button>
              </>
            )}
          </div>

          {selectedFile && (
            <div className="caption-section">
              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="caption-input"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`btn btn-save ${mode}`}
              >
                {uploading ? 'Uploading...' : 'Save Memory'}
              </button>
            </div>
          )}
        </div>

        <div className="memories-grid">
          {memories.length === 0 ? (
            <p className="no-memories">No memories yet. Add your first one! 💕</p>
          ) : (
            memories.map((memory) => (
              <div
                key={memory.id}
                className="memory-card"
                onClick={() => handleMemoryClick(memory)}
              >
                {memory.type === 'video' ? (
                  <video
                    src={memory.mediaUrl}
                    className="memory-media"
                    controls
                  />
                ) : (
                  <img
                    src={memory.mediaUrl}
                    alt="Memory"
                    className="memory-media"
                  />
                )}
                <div className="memory-caption">{memory.caption}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
