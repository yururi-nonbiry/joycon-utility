import React, { useState, useEffect, useMemo } from 'react';
import ButtonMapping from './ButtonMapping';
import StickSettingsModal from './StickSettingsModal';
import './JoyConSettings.css';
import { socket } from './socket';
import type { Mapping, StickConfig, JoyConDevice } from './types';

interface JoyConSettingsProps {
  allJoyCons: JoyConDevice[];
}

const JoyConSettings: React.FC<JoyConSettingsProps> = ({ allJoyCons }) => {
  const [mappings, setMappings] = useState<{ L?: Mapping, R?: Mapping }>({});
  const [isStickModalOpen, setStickModalOpen] = useState(false);
  const [editingStick, setEditingStick] = useState<{ deviceType: 'L' | 'R', stickKey: 'stick_l' | 'stick_r', label: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const joyConL = useMemo(() => allJoyCons.find(jc => jc.type === 'L'), [allJoyCons]);
  const joyConR = useMemo(() => allJoyCons.find(jc => jc.type === 'R'), [allJoyCons]);

  useEffect(() => {
    const targetLId = joyConL ? joyConL.id : 'L';
    const targetRId = joyConR ? joyConR.id : 'R';

    socket.emit('load_joycon_mapping', { deviceId: targetLId });
    socket.emit('load_joycon_mapping', { deviceId: targetRId });

    const handleMappingLoaded = (data: { deviceId: string, mapping: Mapping }) => {
      if (data.deviceId === targetLId) {
        setMappings(prev => ({ ...prev, L: data.mapping || {} }));
      } else if (data.deviceId === targetRId) {
        setMappings(prev => ({ ...prev, R: data.mapping || {} }));
      }
    };

    socket.on('joycon_mapping_loaded', handleMappingLoaded);
    return () => {
      socket.off('joycon_mapping_loaded', handleMappingLoaded);
      setMappings({});
    };
  }, [joyConL, joyConR]);

  const handleMappingChange = (type: 'L' | 'R', newMapping: Mapping) => {
    setMappings(prev => ({ ...prev, [type]: newMapping }));
  };

  const handleSave = () => {
    const targetLId = joyConL ? joyConL.id : 'L';
    const targetRId = joyConR ? joyConR.id : 'R';

    if (mappings.L) socket.emit('save_joycon_mapping', { deviceId: targetLId, mapping: mappings.L });
    if (mappings.R) socket.emit('save_joycon_mapping', { deviceId: targetRId, mapping: mappings.R });
    
    setSaveStatus('Settings saved!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleOpenStickSettings = (deviceType: 'L' | 'R', stickKey: 'stick_l' | 'stick_r') => {
    setEditingStick({ deviceType, stickKey, label: deviceType === 'L' ? '左スティック' : '右スティック' });
    setStickModalOpen(true);
  };

  const handleStickConfigChange = (newConfig: StickConfig) => {
    if (editingStick) {
      const { deviceType, stickKey } = editingStick;
      setMappings(prev => ({
        ...prev,
        [deviceType]: {
          ...prev[deviceType],
          [stickKey]: newConfig,
        },
      }));
    }
  };

  const currentStickConfig = editingStick ? mappings[editingStick.deviceType]?.[editingStick.stickKey] as StickConfig : undefined;

  return (
    <div className="joycon-settings-panel">
      <h2>Joy-Con Settings</h2>

      <div className="dual-view-container">
        <div className="joycon-view">
          <div className="joycon-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Joy-Con (L)</span>
            <span className={`status-badge ${joyConL ? 'connected' : 'disconnected'}`} style={{
              fontSize: '0.8em',
              padding: '3px 8px',
              borderRadius: '12px',
              backgroundColor: joyConL ? '#28a745' : '#6c757d',
              color: 'white'
            }}>
              {joyConL ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <ButtonMapping
            deviceType="L"
            initialMapping={mappings.L || {}}
            onMappingChange={(newMap) => handleMappingChange('L', newMap)}
            pressedButtons={joyConL?.buttons || {}}
            onOpenStickSettings={(stickKey) => handleOpenStickSettings('L', stickKey as 'stick_l' | 'stick_r')}
          />
        </div>
        <div className="joycon-view">
          <div className="joycon-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Joy-Con (R)</span>
            <span className={`status-badge ${joyConR ? 'connected' : 'disconnected'}`} style={{
              fontSize: '0.8em',
              padding: '3px 8px',
              borderRadius: '12px',
              backgroundColor: joyConR ? '#28a745' : '#6c757d',
              color: 'white'
            }}>
              {joyConR ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <ButtonMapping
            deviceType="R"
            initialMapping={mappings.R || {}}
            onMappingChange={(newMap) => handleMappingChange('R', newMap)}
            pressedButtons={joyConR?.buttons || {}}
            onOpenStickSettings={(stickKey) => handleOpenStickSettings('R', stickKey as 'stick_l' | 'stick_r')}
          />
        </div>
      </div>

      <div className="settings-actions" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={handleSave} className="button-primary">Save Mappings</button>
        {saveStatus && <span className="save-status-msg" style={{ color: '#28a745', fontWeight: 'bold' }}>{saveStatus}</span>}
      </div>

      {editingStick && (
        <StickSettingsModal
          isOpen={isStickModalOpen}
          onClose={() => setStickModalOpen(false)}
          stickConfig={currentStickConfig}
          onConfigChange={handleStickConfigChange}
          stickLabel={editingStick.label}
        />
      )}
    </div>
  );
};

export default JoyConSettings;
