import React from 'react';
import Settings from './Settings';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="settings-modal-close-icon" onClick={onClose} aria-label="Close settings">
          &times;
        </button>
        <Settings activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
};

export default SettingsModal;
