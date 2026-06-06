import React, { useState, useEffect } from 'react';
import './App.css';
import { socket } from './socket';
import Settings from './Settings';
import { ThemeProvider } from './contexts/ThemeContext';
import { DeviceSettingsProvider, useDeviceSettings } from './contexts/DeviceSettingsContext';
import type { JoyConDevice } from './types';

const MainContent: React.FC = () => {
  const [joycons, setJoycons] = useState<JoyConDevice[]>([]); // Joy-Con用のstate
  const { findProfileByAppName } = useDeviceSettings();
  const [activeTab, setActiveTab] = useState('theme');

  useEffect(() => {
    // Joy-Conデバイスリストの受信
    socket.on('joycon_devices', (data) => {
      setJoycons(data.devices || []);
    });

    // Joy-Conの状態更新
    socket.on('joycon_update', (data) => {
      setJoycons(prevJoycons => 
        prevJoycons.map(jc => {
          if (jc.id === data.id) {
            if (data.type === 'battery') {
              return { ...jc, battery: data.level };
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
    <main>
      <div className="main-content-full">
        <Settings joycons={joycons} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
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