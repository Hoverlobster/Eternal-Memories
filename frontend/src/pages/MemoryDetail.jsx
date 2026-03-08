import React, { useState } from 'react';
import './MemoryDetail.css';

export default function MemoryDetail({ mode, memory, setScreen, deleteMemory }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    deleteMemory(memory.id);
  };

  return (
    <div className={`memory-detail ${mode}`}>
      <div className="detail-container">
        <button
          onClick={() => setScreen('memories')}
          className="back-btn"
        >
          ✕
        </button>

        <div className="detail-content">
          {memory.type === 'video' ? (
            <video
              src={memory.mediaUrl}
              controls
              className="detail-media"
              autoPlay
            />
          ) : (
            <img
              src={memory.mediaUrl}
              alt="Memory"
              className="detail-media"
            />
          )}

          <div className="detail-caption-section">
            <p className="detail-caption">{memory.caption}</p>
          </div>

          <div className="detail-buttons">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-delete"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-modal">
          <div className="delete-confirm">
            <p>Delete this memory?</p>
            <div className="confirm-buttons">
              <button
                onClick={handleDelete}
                className="btn btn-confirm-delete"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
