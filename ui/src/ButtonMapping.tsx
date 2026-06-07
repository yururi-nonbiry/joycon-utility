import React, { useEffect, useState } from 'react';
import './ButtonMapping.css';
import type { Mapping, StickConfig } from './types';

interface ButtonMappingProps {
  deviceType: 'L' | 'R';
  initialMapping: Mapping;
  onMappingChange: (mapping: Mapping) => void;
  pressedButtons: { [key: string]: boolean };
  onOpenStickSettings: (stick: 'stick_l' | 'stick_r') => void;
}

interface KeyPaletteProps {
  currentValue: any;
  onSelectValue: (val: any) => void;
  style?: React.CSSProperties;
  layouts: string[];
}

// ボタンの内部名と表示名のマッピング
const buttonLabels: { [key: string]: string } = {
  arrow_up: '十字キー 上',
  arrow_down: '十字キー 下',
  arrow_left: '十字キー 左',
  arrow_right: '十字キー 右',
  stick_press_l: 'スティック押し込み',
  stick_l: '左スティック',
  l: 'L ボタン',
  zl: 'ZL ボタン',
  sl: 'SL ボタン',
  sr: 'SR ボタン',
  minus: 'マイナスボタン',
  capture: 'キャプチャボタン',
  a: 'A ボタン',
  b: 'B ボタン',
  x: 'X ボタン',
  y: 'Y ボタン',
  stick_press_r: 'スティック押し込み',
  stick_r: '右スティック',
  r: 'R ボタン',
  zr: 'ZR ボタン',
  plus: 'プラスボタン',
  home: 'ホームボタン',
};

const joyConLButtons = [
  'arrow_up', 'arrow_down', 'arrow_left', 'arrow_right',
  'stick_press_l', 'stick_l', 'l', 'zl', 'sl', 'sr', 'minus', 'capture'
];

const joyConRButtons = [
  'a', 'b', 'x', 'y',
  'stick_press_r', 'stick_r', 'r', 'zr', 'sl', 'sr', 'plus', 'home'
];

// スティックのモード
const stickModes = [
  { value: 'none', label: 'なし' },
  { value: 'mouse', label: 'マウスカーソル' },
  { value: '8way', label: '8方向キー' },
  { value: 'dial', label: 'ダイヤル' },
];

const KeyPalette: React.FC<KeyPaletteProps> = ({ currentValue, onSelectValue, style, layouts }) => {
  const [activeTab, setActiveTab] = useState<'normal' | 'mod_tap' | 'tap_dance' | 'layer_switch'>('normal');

  // Mod-Tap fields
  const [modTapTap, setModTapTap] = useState('');
  const [modTapHold, setModTapHold] = useState('');
  const [modTapActiveField, setModTapActiveField] = useState<'tap' | 'hold'>('tap');

  // Tap Dance fields
  const [tapDanceSingle, setTapDanceSingle] = useState('');
  const [tapDanceDouble, setTapDanceDouble] = useState('');
  const [tapDanceHold, setTapDanceHold] = useState('');
  const [tapDanceActiveField, setTapDanceActiveField] = useState<'single' | 'double' | 'hold'>('single');

  // Layer Switch fields
  const [layerSwitchMode, setLayerSwitchMode] = useState<'toggle' | 'momentary'>('toggle');
  const [layerSwitchTarget, setLayerSwitchTarget] = useState('Default');

  const keyCategories: { category: string; keys: { label: string; value: any }[] }[] = [
    {
      category: 'よく使うキー',
      keys: [
        { label: 'Space', value: 'space' },
        { label: 'Enter', value: 'enter' },
        { label: 'Esc', value: 'esc' },
        { label: 'Backspace', value: 'backspace' },
        { label: 'Tab', value: 'tab' },
        { label: 'Delete', value: 'delete' },
        { label: 'なし (クリア)', value: '' }
      ]
    },
    {
      category: '修飾キー',
      keys: [
        { label: 'Ctrl', value: 'ctrl' },
        { label: 'Shift', value: 'shift' },
        { label: 'Alt', value: 'alt' },
        { label: 'Cmd/Win', value: 'cmd' }
      ]
    },
    {
      category: '矢印キー',
      keys: [
        { label: '↑', value: 'up' },
        { label: '↓', value: 'down' },
        { label: '←', value: 'left' },
        { label: '→', value: 'right' }
      ]
    },
    {
      category: 'アルファベット',
      keys: 'abcdefghijklmnopqrstuvwxyz'.split('').map(char => ({ label: char.toUpperCase(), value: char }))
    },
    {
      category: '数字',
      keys: '0123456789'.split('').map(char => ({ label: char, value: char }))
    },
    {
      category: 'ファンクション',
      keys: Array.from({ length: 12 }, (_, i) => ({ label: `F${i + 1}`, value: `f${i + 1}` }))
    },
    {
      category: 'レイヤー切り替え',
      keys: (layouts || []).flatMap(layout => [
        { label: `Toggle: ${layout}`, value: { type: 'layer_switch', switch_mode: 'toggle', target_layout: layout } },
        { label: `Hold: ${layout}`, value: { type: 'layer_switch', switch_mode: 'momentary', target_layout: layout } }
      ])
    }
  ];

  useEffect(() => {
    if (typeof currentValue === 'object' && currentValue !== null) {
      if (currentValue.type === 'mod_tap') {
        setActiveTab('mod_tap');
        setModTapTap(currentValue.tap || '');
        setModTapHold(currentValue.hold || '');
      } else if (currentValue.type === 'tap_dance') {
        setActiveTab('tap_dance');
        setTapDanceSingle(currentValue.single_tap || '');
        setTapDanceDouble(currentValue.double_tap || '');
        setTapDanceHold(currentValue.hold || '');
      } else if (currentValue.type === 'layer_switch') {
        setActiveTab('layer_switch');
        setLayerSwitchMode(currentValue.switch_mode || 'toggle');
        setLayerSwitchTarget(currentValue.target_layout || 'Default');
      }
    } else {
      setActiveTab('normal');
      setModTapTap('');
      setModTapHold('');
      setTapDanceSingle('');
      setTapDanceDouble('');
      setTapDanceHold('');
      setLayerSwitchMode('toggle');
      setLayerSwitchTarget('Default');
    }
  }, [currentValue]);

  const handleKeyGridSelect = (key: any) => {
    if (activeTab === 'normal') {
      onSelectValue(key);
    } else if (activeTab === 'mod_tap') {
      const keyStr = typeof key === 'string' ? key : '';
      if (modTapActiveField === 'tap') {
        setModTapTap(keyStr);
      } else {
        setModTapHold(keyStr);
      }
    } else if (activeTab === 'tap_dance') {
      const keyStr = typeof key === 'string' ? key : '';
      if (tapDanceActiveField === 'single') {
        setTapDanceSingle(keyStr);
      } else if (tapDanceActiveField === 'double') {
        setTapDanceDouble(keyStr);
      } else {
        setTapDanceHold(keyStr);
      }
    }
  };

  return (
    <div className="key-palette" style={style}>
      <div className="palette-tabs" style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('normal')} 
          className={`palette-tab ${activeTab === 'normal' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px 2px', fontSize: '0.78em', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'normal' ? '2px solid #007bff' : '2px solid transparent', fontWeight: activeTab === 'normal' ? 'bold' : 'normal', color: 'inherit' }}
        >通常</button>
        <button 
          onClick={() => setActiveTab('mod_tap')} 
          className={`palette-tab ${activeTab === 'mod_tap' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px 2px', fontSize: '0.78em', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'mod_tap' ? '2px solid #007bff' : '2px solid transparent', fontWeight: activeTab === 'mod_tap' ? 'bold' : 'normal', color: 'inherit' }}
        >Mod-Tap</button>
        <button 
          onClick={() => setActiveTab('tap_dance')} 
          className={`palette-tab ${activeTab === 'tap_dance' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px 2px', fontSize: '0.78em', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'tap_dance' ? '2px solid #007bff' : '2px solid transparent', fontWeight: activeTab === 'tap_dance' ? 'bold' : 'normal', color: 'inherit' }}
        >Tap Dance</button>
        <button 
          onClick={() => setActiveTab('layer_switch')} 
          className={`palette-tab ${activeTab === 'layer_switch' ? 'active' : ''}`}
          style={{ flex: 1, padding: '6px 2px', fontSize: '0.78em', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'layer_switch' ? '2px solid #007bff' : '2px solid transparent', fontWeight: activeTab === 'layer_switch' ? 'bold' : 'normal', color: 'inherit' }}
        >レイヤー切替</button>
      </div>

      {activeTab === 'mod_tap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
          <div>
            <label style={{ fontSize: '0.8em', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: 'inherit' }}>タップ時 (Tap):</label>
            <input 
              type="text" 
              value={modTapTap} 
              onFocus={() => setModTapActiveField('tap')}
              onChange={(e) => setModTapTap(e.target.value)}
              placeholder="例: space, z"
              style={{ width: '100%', padding: '5px', fontSize: '0.9em', border: modTapActiveField === 'tap' ? '2px solid #007bff' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', color: '#000' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8em', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: 'inherit' }}>ホールド時 (Hold):</label>
            <input 
              type="text" 
              value={modTapHold} 
              onFocus={() => setModTapActiveField('hold')}
              onChange={(e) => setModTapHold(e.target.value)}
              placeholder="例: ctrl, shift"
              style={{ width: '100%', padding: '5px', fontSize: '0.9em', border: modTapActiveField === 'hold' ? '2px solid #007bff' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', color: '#000' }}
            />
          </div>
          <button 
            onClick={() => onSelectValue({ type: 'mod_tap', tap: modTapTap.trim(), hold: modTapHold.trim() })}
            className="button-primary"
            style={{ width: '100%', padding: '6px', fontSize: '0.9em', cursor: 'pointer' }}
          >
            適用する (Apply)
          </button>
        </div>
      )}

      {activeTab === 'tap_dance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
          <div>
            <label style={{ fontSize: '0.8em', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: 'inherit' }}>1回タップ (Single Tap):</label>
            <input 
              type="text" 
              value={tapDanceSingle} 
              onFocus={() => setTapDanceActiveField('single')}
              onChange={(e) => setTapDanceSingle(e.target.value)}
              placeholder="例: z"
              style={{ width: '100%', padding: '5px', fontSize: '0.9em', border: tapDanceActiveField === 'single' ? '2px solid #007bff' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', color: '#000' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8em', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: 'inherit' }}>2回タップ (Double Tap):</label>
            <input 
              type="text" 
              value={tapDanceDouble} 
              onFocus={() => setTapDanceActiveField('double')}
              onChange={(e) => setTapDanceDouble(e.target.value)}
              placeholder="例: x"
              style={{ width: '100%', padding: '5px', fontSize: '0.9em', border: tapDanceActiveField === 'double' ? '2px solid #007bff' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', color: '#000' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8em', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: 'inherit' }}>ホールド (Hold - オプション):</label>
            <input 
              type="text" 
              value={tapDanceHold} 
              onFocus={() => setTapDanceActiveField('hold')}
              onChange={(e) => setTapDanceHold(e.target.value)}
              placeholder="例: ctrl"
              style={{ width: '100%', padding: '5px', fontSize: '0.9em', border: tapDanceActiveField === 'hold' ? '2px solid #007bff' : '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', color: '#000' }}
            />
          </div>
          <button 
            onClick={() => onSelectValue({ type: 'tap_dance', single_tap: tapDanceSingle.trim(), double_tap: tapDanceDouble.trim(), hold: tapDanceHold.trim() })}
            className="button-primary"
            style={{ width: '100%', padding: '6px', fontSize: '0.9em', cursor: 'pointer' }}
          >
            適用する (Apply)
          </button>
        </div>
      )}

      {activeTab === 'layer_switch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
          <div>
            <label style={{ fontSize: '0.8em', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: 'inherit' }}>切替モード (Mode):</label>
            <select
              value={layerSwitchMode}
              onChange={(e) => setLayerSwitchMode(e.target.value as 'toggle' | 'momentary')}
              style={{ width: '100%', padding: '5px', fontSize: '0.95em', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#000' }}
            >
              <option value="toggle">トグル切替 (Toggle)</option>
              <option value="momentary">ホールド切替 (Momentary)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8em', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: 'inherit' }}>切替先レイアウト (Target):</label>
            <select
              value={layerSwitchTarget}
              onChange={(e) => setLayerSwitchTarget(e.target.value)}
              style={{ width: '100%', padding: '5px', fontSize: '0.95em', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#000' }}
            >
              {layouts.map(layout => (
                <option key={layout} value={layout}>{layout}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => onSelectValue({ type: 'layer_switch', switch_mode: layerSwitchMode, target_layout: layerSwitchTarget })}
            className="button-primary"
            style={{ width: '100%', padding: '6px', fontSize: '0.9em', cursor: 'pointer' }}
          >
            適用する (Apply)
          </button>
        </div>
      )}

      {/* Grid of keys for selection */}
      <div className="palette-grid-section" style={{ maxHeight: '180px', overflowY: 'auto' }}>
        {keyCategories.map(cat => (
          <div key={cat.category} style={{ marginBottom: '10px' }}>
            <div className="key-palette-category">{cat.category}</div>
            <div className="key-palette-grid">
              {cat.keys.map(k => (
                <button
                  key={typeof k.value === 'string' ? k.label : JSON.stringify(k.value)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKeyGridSelect(k.value);
                  }}
                  className="key-palette-btn"
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface JoyConDiagramProps {
  type: 'L' | 'R';
  pressedButtons: { [key: string]: boolean };
  onButtonClick?: (buttonName: string) => void;
}

// Joy-Conの模式図コンポーネント (インタラクティブ)
export const JoyConDiagram: React.FC<JoyConDiagramProps> = ({ type, pressedButtons, onButtonClick }) => (
  <div className={`joycon-diagram joycon-diagram-${type.toLowerCase()}`}>
    {type === 'L' ? (
      <>
        <div className={`joycon-button l-button ${pressedButtons['l'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('l')} style={{ cursor: 'pointer' }}>L</div>
        <div className={`joycon-button zl-button ${pressedButtons['zl'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('zl')} style={{ cursor: 'pointer' }}>ZL</div>
        <div className={`joycon-button sl-button-left ${pressedButtons['sl'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('sl')} style={{ cursor: 'pointer' }}>SL</div>
        <div className={`joycon-button sr-button-left ${pressedButtons['sr'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('sr')} style={{ cursor: 'pointer' }}>SR</div>
        <div className={`joycon-stick joycon-stick-l ${pressedButtons['stick_press_l'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('stick_l')} style={{ cursor: 'pointer' }}></div>
        <div className={`joycon-button arrow-up ${pressedButtons['arrow_up'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('arrow_up')} style={{ cursor: 'pointer' }}>▲</div>
        <div className={`joycon-button arrow-down ${pressedButtons['arrow_down'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('arrow_down')} style={{ cursor: 'pointer' }}>▼</div>
        <div className={`joycon-button arrow-left ${pressedButtons['arrow_left'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('arrow_left')} style={{ cursor: 'pointer' }}>◀</div>
        <div className={`joycon-button arrow-right ${pressedButtons['arrow_right'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('arrow_right')} style={{ cursor: 'pointer' }}>▶</div>
        <div className={`joycon-button minus ${pressedButtons['minus'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('minus')} style={{ cursor: 'pointer' }}>-</div>
        <div className={`joycon-button capture ${pressedButtons['capture'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('capture')} style={{ cursor: 'pointer' }}>■</div>
      </>
    ) : (
      <>
        <div className={`joycon-button r-button ${pressedButtons['r'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('r')} style={{ cursor: 'pointer' }}>R</div>
        <div className={`joycon-button zr-button ${pressedButtons['zr'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('zr')} style={{ cursor: 'pointer' }}>ZR</div>
        <div className={`joycon-button sl-button-right ${pressedButtons['sr'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('sr')} style={{ cursor: 'pointer' }}>SR</div>
        <div className={`joycon-button sr-button-right ${pressedButtons['sl'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('sl')} style={{ cursor: 'pointer' }}>SL</div>
        <div className={`joycon-stick joycon-stick-r ${pressedButtons['stick_press_r'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('stick_r')} style={{ cursor: 'pointer' }}></div>
        <div className={`joycon-button button-a ${pressedButtons['a'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('a')} style={{ cursor: 'pointer' }}>A</div>
        <div className={`joycon-button button-b ${pressedButtons['b'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('b')} style={{ cursor: 'pointer' }}>B</div>
        <div className={`joycon-button button-x ${pressedButtons['x'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('x')} style={{ cursor: 'pointer' }}>X</div>
        <div className={`joycon-button button-y ${pressedButtons['y'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('y')} style={{ cursor: 'pointer' }}>Y</div>
        <div className={`joycon-button plus ${pressedButtons['plus'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('plus')} style={{ cursor: 'pointer' }}>+</div>
        <div className={`joycon-button home ${pressedButtons['home'] ? 'pressed' : ''}`} onClick={() => onButtonClick?.('home')} style={{ cursor: 'pointer' }}>⌂</div>
      </>
    )}
  </div>
);

const ButtonMapping: React.FC<ButtonMappingProps> = ({ deviceType, initialMapping, onMappingChange, pressedButtons, onOpenStickSettings }) => {
  const [mapping, setMapping] = useState(initialMapping);
  const [activePaletteButton, setActivePaletteButton] = useState<string | null>(null);

  useEffect(() => {
    setMapping(initialMapping);
  }, [initialMapping]);

  const handleInputChange = (button: string, value: any) => {
    const newMapping = { ...mapping };
    const isStick = button === 'stick_l' || button === 'stick_r';

    if (isStick) {
      const currentConfig = typeof newMapping[button] === 'object' ? newMapping[button] as StickConfig : { mode: 'none' } as StickConfig;
      const newMode = value as StickConfig['mode'];

      if (newMode === 'mouse') {
        newMapping[button] = {
          mode: 'mouse',
          sensitivity: currentConfig.sensitivity || 50,
        };
      } else if (newMode === '8way') {
        newMapping[button] = {
          mode: '8way',
          mappings: currentConfig.mappings || {},
        };
      } else if (newMode === 'dial') {
        newMapping[button] = {
          mode: 'dial',
          dials: currentConfig.dials || {},
        };
      } else {
        newMapping[button] = { mode: 'none' };
      }
    } else {
      newMapping[button] = value;
    }
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const handleDiagramButtonClick = (buttonName: string) => {
    const isStick = buttonName === 'stick_l' || buttonName === 'stick_r';
    const inputElement = document.getElementById(`map-${buttonName}`) as HTMLInputElement | HTMLSelectElement | null;
    if (inputElement) {
      inputElement.focus();
      inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!isStick) {
        setActivePaletteButton(buttonName);
      }
    }
  };

  const buttons = deviceType === 'L' ? joyConLButtons : joyConRButtons;

  // レンダリングする入力要素を決定する関数
  const renderInputControl = (button: string) => {
    const isStick = button === 'stick_l' || button === 'stick_r';
    const value = mapping[button];

    if (isStick) {
      const config: StickConfig = typeof value === 'object' ? value as StickConfig : { mode: (value || 'none') as StickConfig['mode'] };
      
      return (
        <div className="stick-control">
          <select
            id={`map-${button}`}
            value={config.mode || 'none'}
            onChange={(e) => handleInputChange(button, e.target.value)}
          >
            {stickModes.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {(config.mode === 'mouse' || config.mode === '8way' || config.mode === 'dial') && (
            <button className="details-button" onClick={() => onOpenStickSettings(button as 'stick_l' | 'stick_r')}>
              詳細設定
            </button>
          )}
        </div>
      );
    }

    let displayValue = '';
    if (typeof value === 'object' && value !== null) {
      if (value.type === 'mod_tap') {
        displayValue = `Mod-Tap (Tap: ${value.tap || 'なし'}, Hold: ${value.hold || 'なし'})`;
      } else if (value.type === 'tap_dance') {
        displayValue = `Tap Dance (1x: ${value.single_tap || 'なし'}, 2x: ${value.double_tap || 'なし'}${value.hold ? `, Hold: ${value.hold}` : ''})`;
      } else if (value.type === 'layer_switch') {
        const modeStr = value.switch_mode === 'toggle' ? 'トグル' : 'ホールド';
        displayValue = `Layer (${modeStr}: ${value.target_layout || 'なし'})`;
      }
    } else {
      displayValue = (value as string) || '';
    }

    return (
      <div className="input-with-palette-container" style={{ position: 'relative', flexGrow: 1, display: 'flex' }}>
        <input
          id={`map-${button}`}
          type="text"
          value={displayValue}
          readOnly={typeof value === 'object' && value !== null}
          onFocus={() => setActivePaletteButton(button)}
          onChange={(e) => handleInputChange(button, e.target.value)}
          placeholder="例: a, ctrl_l, space"
          style={{ width: '100%', boxSizing: 'border-box', fontWeight: typeof value === 'object' ? 'bold' : 'normal' }}
        />
        {activePaletteButton === button && (
          <>
            <div 
              className="palette-backdrop" 
              onClick={() => setActivePaletteButton(null)} 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 998,
                background: 'transparent'
              }}
            />
            <KeyPalette 
              currentValue={value}
              layouts={layouts}
              onSelectValue={(val) => {
                handleInputChange(button, val);
                setActivePaletteButton(null);
              }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 999,
                marginTop: '4px'
              }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="button-mapping-layout">
      {deviceType === 'L' ? (
        <>
          <div className="mapping-list-container">
            {buttons.map(button => {
              const isPressed = pressedButtons && pressedButtons[button];
              return (
                <div key={button} className={`mapping-item ${isPressed ? 'pressed' : ''}`}>
                  <label htmlFor={`map-${button}`}>{buttonLabels[button] || button}</label>
                  {renderInputControl(button)}
                </div>
              );
            })}
          </div>
          <div className="diagram-container">
            <JoyConDiagram type={deviceType} pressedButtons={pressedButtons} onButtonClick={handleDiagramButtonClick} />
          </div>
        </>
      ) : (
        <>
          <div className="diagram-container">
            <JoyConDiagram type={deviceType} pressedButtons={pressedButtons} onButtonClick={handleDiagramButtonClick} />
          </div>
          <div className="mapping-list-container">
            {buttons.map(button => {
              const isPressed = pressedButtons && pressedButtons[button];
              return (
                <div key={button} className={`mapping-item ${isPressed ? 'pressed' : ''}`}>
                  <label htmlFor={`map-${button}`}>{buttonLabels[button] || button}</label>
                  {renderInputControl(button)}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ButtonMapping;
