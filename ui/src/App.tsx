import React, { useState, useEffect } from 'react';
import './App.css';
import { socket } from './socket';
import JoyConSettings from './JoyConSettings';
import SettingsModal from './SettingsModal';
import { ThemeProvider } from './contexts/ThemeContext';
import { DeviceSettingsProvider, useDeviceSettings } from './contexts/DeviceSettingsContext';
import type { JoyConDevice } from './types';

const MainContent: React.FC = () => {
  const [joycons, setJoycons] = useState<JoyConDevice[]>([]); // Joy-Con用のstate
  const { findProfileByAppName } = useDeviceSettings();
  const [activeTab, setActiveTab] = useState('theme');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Joy-Conデバイスリストの受信
    socket.on('joycon_devices', (data: { devices?: JoyConDevice[] }) => {
      setJoycons(data.devices || []);
    });

    // Joy-Conの状態更新
    socket.on('joycon_update', (data: { id: string; type: string; level?: number; buttons?: { [key: string]: boolean } }) => {
      setJoycons(prevJoycons => 
        prevJoycons.map(jc => {
          if (jc.id === data.id) {
            if (data.type === 'battery') {
              return { ...jc, battery: data.level || 0 };
            } else if (data.type === 'input') {
              return { ...jc, buttons: data.buttons }; // ボタン状態を直接保持
            }
          }
          return jc;
        })
      );
    });

    window.electron.onActiveWindowChange((appName: string) => {
      const profile = findProfileByAppName(appName);
      if (profile) {
        // TODO: Set active profile based on appName
        console.log(`App changed to ${appName}, found profile: ${profile.name}`);
      }
    });

    return () => {
      socket.off('joycon_devices');
      socket.off('joycon_update');
    };
  }, [findProfileByAppName]);

  return (
    <main className="app-main">
      <header className="app-header">
        <h1>Joy-Con PC Utility</h1>
        <button className="settings-icon-btn" onClick={() => setIsSettingsOpen(true)} aria-label="Open Settings">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="gear-icon">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </header>
      <div className="joycon-settings-section">
        <JoyConSettings allJoyCons={joycons} />
      </div>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
    </main>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DeviceSettingsProvider>
        <MainContent />
      </DeviceSettingsProvider>
    </ThemeProvider>
  );
}

export default App;