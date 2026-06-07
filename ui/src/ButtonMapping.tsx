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
  onSelectKey: (key: string) => void;
  style?: React.CSSProperties;
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

const KeyPalette: React.FC<KeyPaletteProps> = ({ onSelectKey, style }) => {
  const keyCategories = [
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
    }
  ];

  return (
    <div className="key-palette" style={style}>
      {keyCategories.map(cat => (
        <div key={cat.category} style={{ marginBottom: '10px' }}>
          <div className="key-palette-category">{cat.category}</div>
          <div className="key-palette-grid">
            {cat.keys.map(k => (
              <button
                key={k.label}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectKey(k.value);
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

  const handleInputChange = (button: string, value: string) => {
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

    return (
      <div className="input-with-palette-container" style={{ position: 'relative', flexGrow: 1, display: 'flex' }}>
        <input
          id={`map-${button}`}
          type="text"
          value={(value as string) || ''}
          onChange={(e) => handleInputChange(button, e.target.value)}
          onFocus={() => setActivePaletteButton(button)}
          placeholder="例: a, ctrl_l, space"
          style={{ width: '100%', boxSizing: 'border-box' }}
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
              onSelectKey={(key) => {
                handleInputChange(button, key);
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
