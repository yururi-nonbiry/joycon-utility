import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ButtonMapping from './ButtonMapping';
import StickSettingsModal from './StickSettingsModal';
import './JoyConSettings.css';
import { socket } from './socket';
import type { Mapping, StickConfig, JoyConDevice } from './types';

interface JoyConSettingsProps {
  allJoyCons: JoyConDevice[];
}

const JoyConSettings: React.FC<JoyConSettingsProps> = ({ allJoyCons }) => {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState<{ L?: Mapping, R?: Mapping }>({});
  const [isStickModalOpen, setStickModalOpen] = useState(false);
  const [editingStick, setEditingStick] = useState<{ deviceType: 'L' | 'R', stickKey: 'stick_l' | 'stick_r', label: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<string[]>(['Default']);
  const [activeLayout, setActiveLayout] = useState<string>('Default');
  const [newLayoutName, setNewLayoutName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

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

    const handleLayoutsUpdate = (data: { layouts: string[], activeLayout: string }) => {
      setLayouts(data.layouts || ['Default']);
      setActiveLayout(data.activeLayout || 'Default');
    };

    const handleLayoutSwitched = (data: { layoutName: string }) => {
      setActiveLayout(data.layoutName);
      socket.emit('load_joycon_mapping', { deviceId: targetLId });
      socket.emit('load_joycon_mapping', { deviceId: targetRId });
    };

    const handleLayoutError = (data: { message: string }) => {
      alert(data.message);
    };

    socket.on('joycon_mapping_loaded', handleMappingLoaded);
    socket.on('layouts_update', handleLayoutsUpdate);
    socket.on('layout_switched', handleLayoutSwitched);
    socket.on('layout_error', handleLayoutError);

    socket.emit('get_layouts');

    return () => {
      socket.off('joycon_mapping_loaded', handleMappingLoaded);
      socket.off('layouts_update', handleLayoutsUpdate);
      socket.off('layout_switched', handleLayoutSwitched);
      socket.off('layout_error', handleLayoutError);
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
    
    setSaveStatus(t('settingsSaved'));
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSwitchLayout = (layoutName: string) => {
    socket.emit('switch_layout', { layoutName });
  };

  const handleCreateLayout = () => {
    const trimmed = newLayoutName.trim();
    if (trimmed) {
      socket.emit('create_layout', { layoutName: trimmed });
      setShowCreateModal(false);
      setNewLayoutName('');
    }
  };

  const handleDeleteLayout = (layoutName: string) => {
    if (layoutName === 'Default') return;
    if (window.confirm(t('confirmDeleteLayout', { name: layoutName }))) {
      socket.emit('delete_layout', { layoutName });
    }
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
      <div className="settings-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0 }}>{t('joyconSettings')}</h2>
        
        {/* Layout Management Controls */}
        <div className="layout-management" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="layout-select" style={{ fontWeight: 'bold' }}>{t('layout')}:</label>
          <select 
            id="layout-select" 
            value={activeLayout} 
            onChange={(e) => handleSwitchLayout(e.target.value)}
            className="layout-select-dropdown"
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #555',
              backgroundColor: 'var(--select-bg, #282c34)',
              color: 'var(--select-color, white)',
              fontSize: '0.95em'
            }}
          >
            {layouts.map(layout => (
              <option key={layout} value={layout}>{layout}</option>
            ))}
          </select>
          
          <button onClick={() => setShowCreateModal(true)} className="button-outline" style={{ padding: '6px 12px', fontSize: '0.9em' }}>
            {t('newLayout')}
          </button>
          
          <button 
            onClick={() => handleDeleteLayout(activeLayout)} 
            className="button-outline" 
            disabled={activeLayout === 'Default'}
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.9em',
              borderColor: activeLayout === 'Default' ? '#444' : '#dc3545',
              color: activeLayout === 'Default' ? '#666' : '#dc3545'
            }}
          >
            {t('delete')}
          </button>
        </div>
      </div>

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
            layouts={layouts}
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
            layouts={layouts}
          />
        </div>
      </div>

      <div className="settings-actions" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={handleSave} className="button-primary">{t('saveMappings')}</button>
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

      {/* Create Layout Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', minWidth: '300px' }}>
            <h3 style={{ marginTop: 0, color: '#000' }}>{t('createLayout')}</h3>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="new-layout-name" style={{ color: '#000', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('layoutName')}</label>
              <input
                type="text"
                id="new-layout-name"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                placeholder="e.g. FPS Mode, RPG Mode"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  color: '#000'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLayoutName.trim()) {
                    handleCreateLayout();
                  }
                }}
              />
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setNewLayoutName('');
                }} 
                className="close-button"
                style={{ margin: 0, padding: '8px 16px', cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleCreateLayout} 
                className="save-button"
                disabled={!newLayoutName.trim()}
                style={{ margin: 0, padding: '8px 16px', cursor: 'pointer' }}
              >
                {t('create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoyConSettings;
