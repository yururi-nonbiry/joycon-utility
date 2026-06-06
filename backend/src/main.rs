use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::protocol::Message;

// --- Win32 Input Simulation ---
use std::mem::size_of;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYEVENTF_KEYUP, MOUSEINPUT,
    MOUSEEVENTF_MOVE,
};

fn simulate_key_down(vk: u16) {
    unsafe {
        let mut input: INPUT = std::mem::zeroed();
        input.type_ = INPUT_KEYBOARD;
        input.Anonymous.ki = KEYBDINPUT {
            wVk: vk,
            wScan: 0,
            dwFlags: 0,
            time: 0,
            dwExtraInfo: 0,
        };
        SendInput(1, &input, size_of::<INPUT>() as i32);
    }
}

fn simulate_key_up(vk: u16) {
    unsafe {
        let mut input: INPUT = std::mem::zeroed();
        input.type_ = INPUT_KEYBOARD;
        input.Anonymous.ki = KEYBDINPUT {
            wVk: vk,
            wScan: 0,
            dwFlags: KEYEVENTF_KEYUP,
            time: 0,
            dwExtraInfo: 0,
        };
        SendInput(1, &input, size_of::<INPUT>() as i32);
    }
}

fn simulate_mouse_move(dx: i32, dy: i32) {
    unsafe {
        let mut input: INPUT = std::mem::zeroed();
        input.type_ = INPUT_MOUSE;
        input.Anonymous.mi = MOUSEINPUT {
            dx,
            dy,
            mouseData: 0,
            dwFlags: MOUSEEVENTF_MOVE,
            time: 0,
            dwExtraInfo: 0,
        };
        SendInput(1, &input, size_of::<INPUT>() as i32);
    }
}

// --- Key Code Mapping ---
fn get_vk_code(key_str: &str) -> Option<u16> {
    let s = key_str.to_lowercase();
    match s.as_str() {
        "alt" | "alt_l" => Some(0x12), // VK_MENU / VK_LMENU
        "alt_r" => Some(0xA5), // VK_RMENU
        "ctrl" | "ctrl_l" => Some(0x11), // VK_CONTROL / VK_LCONTROL
        "ctrl_r" => Some(0xA3), // VK_RCONTROL
        "shift" | "shift_l" => Some(0x10), // VK_SHIFT / VK_LSHIFT
        "shift_r" => Some(0xA1), // VK_RSHIFT
        "backspace" => Some(0x08), // VK_BACK
        "caps_lock" => Some(0x14), // VK_CAPITAL
        "cmd" | "cmd_l" => Some(0x5B), // VK_LWIN
        "cmd_r" => Some(0x5C), // VK_RWIN
        "delete" => Some(0x2E), // VK_DELETE
        "down" | "arrow_down" => Some(0x28), // VK_DOWN
        "up" | "arrow_up" => Some(0x26), // VK_UP
        "left" | "arrow_left" => Some(0x25), // VK_LEFT
        "right" | "arrow_right" => Some(0x27), // VK_RIGHT
        "enter" => Some(0x0D), // VK_RETURN
        "esc" => Some(0x1B), // VK_ESCAPE
        "space" => Some(0x20), // VK_SPACE
        "tab" => Some(0x09), // VK_TAB
        "home" => Some(0x24), // VK_HOME
        "end" => Some(0x23), // VK_END
        "page_up" => Some(0x21), // VK_PRIOR
        "page_down" => Some(0x22), // VK_NEXT
        "insert" => Some(0x2D), // VK_INSERT
        "f1" => Some(0x70),
        "f2" => Some(0x71),
        "f3" => Some(0x72),
        "f4" => Some(0x73),
        "f5" => Some(0x74),
        "f6" => Some(0x75),
        "f7" => Some(0x76),
        "f8" => Some(0x77),
        "f9" => Some(0x78),
        "f10" => Some(0x79),
        "f11" => Some(0x7A),
        "f12" => Some(0x7B),
        _ if s.len() == 1 => {
            let c = s.chars().next().unwrap();
            if c >= 'a' && c <= 'z' {
                Some((c as u8 - b'a' + 0x41) as u16) // VK_A to VK_Z
            } else if c >= '0' && c <= '9' {
                Some((c as u8 - b'0' + 0x30) as u16) // VK_0 to VK_9
            } else {
                None
            }
        }
        _ => None,
    }
}

// --- Joy-Con Constants ---
const NINTENDO_VID: u16 = 0x057e;
const JOYCON_L_PID: u16 = 0x2006;
const JOYCON_R_PID: u16 = 0x2007;

const LEFT_MAPPING: &[(u8, &str)] = &[
    (0x01, "arrow_down"),
    (0x02, "arrow_up"),
    (0x04, "arrow_right"),
    (0x08, "arrow_left"),
    (0x10, "sr"),
    (0x20, "sl"),
    (0x40, "l"),
    (0x80, "zl"),
];

const RIGHT_MAPPING: &[(u8, &str)] = &[
    (0x01, "y"),
    (0x02, "x"),
    (0x04, "b"),
    (0x08, "a"),
    (0x10, "sr"),
    (0x20, "sl"),
    (0x40, "r"),
    (0x80, "zr"),
];

const SHARED_MAPPING: &[(u8, &str)] = &[
    (0x01, "minus"),
    (0x02, "plus"),
    (0x04, "stick_press_r"),
    (0x08, "stick_press_l"),
    (0x10, "home"),
    (0x20, "capture"),
];

const MAPPING_FILE: &str = "joycon_mapping.json";
const STICK_DEADZONE: f64 = 0.15;

// --- Structs for Serializing and Deserializing ---
#[derive(Serialize, Deserialize, Clone, Debug)]
struct JoyconDeviceInfo {
    id: String,
    #[serde(rename = "type")]
    device_type: String, // "L" or "R"
    battery: u8,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(untagged)]
enum StickConfig {
    OldStyle(String),
    NewStyle {
        mode: String,
        #[serde(default = "default_sensitivity")]
        sensitivity: i32,
        #[serde(default)]
        mappings: HashMap<String, String>,
        #[serde(default)]
        dials: HashMap<String, DialMapping>,
    },
}

#[derive(Deserialize, Debug, Clone)]
struct DialMapping {
    increase: String,
    decrease: String,
}

fn default_sensitivity() -> i32 {
    25
}

// --- App State ---
struct SharedState {
    mappings: RwLock<HashMap<String, HashMap<String, serde_json::Value>>>,
    connected_devices: RwLock<Vec<JoyconDeviceInfo>>,
    event_tx: tokio::sync::broadcast::Sender<String>,
}

struct OpenJoycon {
    path: String,
    device_type: String,
    device: hidapi::HidDevice,
    packet_counter: u8,
    last_battery_level: i8,
    last_button_state: HashSet<String>,
    last_stick_direction: Option<String>,
    last_stick_angle: f64,
    last_stick_sector: Option<String>,
}

// --- Config Storage ---
fn load_mapping() -> HashMap<String, HashMap<String, serde_json::Value>> {
    if let Ok(content) = std::fs::read_to_string(MAPPING_FILE) {
        if let Ok(map) = serde_json::from_str(&content) {
            println!("Loaded mapping from {}", MAPPING_FILE);
            return map;
        }
    }
    HashMap::new()
}

fn save_mapping(map: &HashMap<String, HashMap<String, serde_json::Value>>) {
    if let Ok(content) = serde_json::to_string_pretty(map) {
        if let Err(e) = std::fs::write(MAPPING_FILE, content) {
            eprintln!("Failed to save mapping to {}: {:?}", MAPPING_FILE, e);
        } else {
            println!("Saved mapping to {}", MAPPING_FILE);
        }
    }
}

// --- HID Utilities ---
fn send_joycon_subcommand(
    device: &hidapi::HidDevice,
    packet_counter: &mut u8,
    command: u8,
    data: &[u8],
) -> Result<(), hidapi::HidError> {
    let mut payload = vec![0x01, *packet_counter & 0xF];
    // Neutral rumble data: 8 bytes
    payload.extend_from_slice(&[0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40]);
    payload.push(command);
    payload.extend_from_slice(data);
    device.write(&payload)?;
    *packet_counter = (*packet_counter + 1) % 16;
    Ok(())
}

fn process_stick_input(x_raw: u16, y_raw: u16, deadzone: f64) -> (f64, f64) {
    let x = (x_raw as f64 - 2048.0) / 2048.0;
    let y = (y_raw as f64 - 2048.0) / 2048.0;
    let magnitude = (x * x + y * y).sqrt();
    if magnitude < deadzone {
        return (0.0, 0.0);
    }
    let normalized_magnitude = (magnitude - deadzone) / (1.0 - deadzone);
    (
        x / magnitude * normalized_magnitude,
        y / magnitude * normalized_magnitude,
    )
}

// --- Joy-Con Thread Manager ---
struct JoyconManager {
    state: Arc<SharedState>,
}

impl JoyconManager {
    fn run(self) {
        let mut api = match hidapi::HidApi::new() {
            Ok(a) => a,
            Err(e) => {
                eprintln!("Failed to initialize HID API: {:?}", e);
                return;
            }
        };

        let mut connected_joycons: Vec<OpenJoycon> = Vec::new();
        let mut last_scan = std::time::Instant::now() - Duration::from_secs(5); // Force scan on startup

        println!("Starting Joy-Con detection loop...");

        loop {
            let now = std::time::Instant::now();

            // 1. Scan for new Joy-Cons every 2 seconds
            if now.duration_since(last_scan).as_secs() >= 2 {
                last_scan = now;

                if let Ok(_) = api.refresh_devices() {
                    let mut current_connected_paths = HashSet::new();
                    for jc in &connected_joycons {
                        current_connected_paths.insert(jc.path.clone());
                    }

                    for device_info in api.device_list() {
                        if device_info.vendor_id() == NINTENDO_VID {
                            let pid = device_info.product_id();
                            if pid == JOYCON_L_PID || pid == JOYCON_R_PID {
                                let path = match device_info.path().to_str() {
                                    Ok(s) => s.to_string(),
                                    Err(_) => continue,
                                };

                                if !current_connected_paths.contains(&path) {
                                    println!("New Joy-Con detected: {}", path);
                                    match device_info.open_device(&api) {
                                        Ok(dev) => {
                                            if let Err(e) = dev.set_blocking_mode(false) {
                                                eprintln!("Failed to set non-blocking mode: {:?}", e);
                                                continue;
                                            }

                                            let device_type = if pid == JOYCON_L_PID { "L" } else { "R" };
                                            let mut open_jc = OpenJoycon {
                                                path: path.clone(),
                                                device_type: device_type.to_string(),
                                                device: dev,
                                                packet_counter: 0,
                                                last_battery_level: -1,
                                                last_button_state: HashSet::new(),
                                                last_stick_direction: None,
                                                last_stick_angle: 0.0,
                                                last_stick_sector: None,
                                            };

                                            // Set input report mode to standard mode (0x30)
                                            if let Err(e) = send_joycon_subcommand(
                                                &open_jc.device,
                                                &mut open_jc.packet_counter,
                                                0x03,
                                                &[0x30],
                                            ) {
                                                eprintln!("Failed to send init command to {}: {:?}", path, e);
                                                continue;
                                            }

                                            connected_joycons.push(open_jc);
                                            self.broadcast_devices_update(&connected_joycons);
                                        }
                                        Err(e) => {
                                            eprintln!("Failed to open device at {}: {:?}", path, e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Read report from all connected controllers
            let mut disconnected_paths = Vec::new();
            let mut buf = [0u8; 64];

            for jc in &mut connected_joycons {
                match jc.device.read(&mut buf) {
                    Ok(bytes_read) => {
                        if bytes_read > 0 {
                            if buf[0] == 0x30 && bytes_read >= 12 {
                                if let Err(e) = self.parse_joycon_report(jc, &buf[..bytes_read]) {
                                    eprintln!("Error parsing report for {}: {:?}", jc.path, e);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Error reading from Joy-Con {}: {:?}", jc.path, e);
                        disconnected_paths.push(jc.path.clone());
                    }
                }
            }

            // 3. Handle disconnections
            if !disconnected_paths.is_empty() {
                connected_joycons.retain(|jc| {
                    let is_disconnected = disconnected_paths.contains(&jc.path);
                    if is_disconnected {
                        println!("Joy-Con disconnected: {}", jc.path);
                    }
                    !is_disconnected
                });
                self.broadcast_devices_update(&connected_joycons);
            }

            std::thread::sleep(Duration::from_millis(8));
        }
    }

    fn broadcast_devices_update(&self, joycons: &[OpenJoycon]) {
        let device_infos: Vec<JoyconDeviceInfo> = joycons
            .iter()
            .map(|jc| JoyconDeviceInfo {
                id: jc.path.clone(),
                device_type: jc.device_type.clone(),
                battery: if jc.last_battery_level < 0 {
                    0
                } else {
                    jc.last_battery_level as u8
                },
            })
            .collect();

        if let Ok(mut lock) = self.state.connected_devices.write() {
            *lock = device_infos.clone();
        }

        let msg = serde_json::json!({
            "event": "joycon_devices",
            "data": {
                "devices": device_infos
            }
        })
        .to_string();

        let _ = self.state.event_tx.send(msg);
    }

    fn parse_joycon_report(&self, jc: &mut OpenJoycon, report: &[u8]) -> Result<(), serde_json::Error> {
        // --- 1. Battery residual and status ---
        let battery_info = report[2];
        let battery_level = (battery_info >> 4) as i8;
        let charging = (battery_info & 0x10) > 0;

        if battery_level != jc.last_battery_level {
            jc.last_battery_level = battery_level;

            let update_msg = serde_json::json!({
                "event": "joycon_update",
                "data": {
                    "id": jc.path.clone(),
                    "type": "battery",
                    "level": battery_level,
                    "charging": charging
                }
            })
            .to_string();
            let _ = self.state.event_tx.send(update_msg);

            // Keep the connected_devices state battery levels updated
            if let Ok(mut lock) = self.state.connected_devices.write() {
                for dev in lock.iter_mut() {
                    if dev.id == jc.path {
                        dev.battery = battery_level as u8;
                    }
                }
                let devices_msg = serde_json::json!({
                    "event": "joycon_devices",
                    "data": {
                        "devices": &*lock
                    }
                })
                .to_string();
                let _ = self.state.event_tx.send(devices_msg);
            }
        }

        // --- 2. Button parsing ---
        let byte3 = report[3];
        let byte4 = report[4];
        let byte5 = report[5];

        let mut current_buttons = HashSet::new();

        if jc.device_type == "L" {
            for &(mask, name) in LEFT_MAPPING {
                if (byte5 & mask) != 0 {
                    current_buttons.insert(name.to_string());
                }
            }
        } else {
            for &(mask, name) in RIGHT_MAPPING {
                if (byte3 & mask) != 0 {
                    current_buttons.insert(name.to_string());
                }
            }
        }

        for &(mask, name) in SHARED_MAPPING {
            if (byte4 & mask) != 0 {
                current_buttons.insert(name.to_string());
            }
        }

        let device_mapping = {
            if let Ok(mappings) = self.state.mappings.read() {
                mappings.get(&jc.path).cloned().unwrap_or_default()
            } else {
                HashMap::new()
            }
        };

        let pressed: Vec<&String> = current_buttons
            .iter()
            .filter(|b| !jc.last_button_state.contains(*b))
            .collect();
        let released: Vec<&String> = jc
            .last_button_state
            .iter()
            .filter(|b| !current_buttons.contains(*b))
            .collect();

        // Perform mapping actions
        for button in &pressed {
            if let Some(serde_json::Value::String(key_string)) = device_mapping.get(*button) {
                if let Some(vk) = get_vk_code(key_string) {
                    simulate_key_down(vk);
                }
            }
        }

        for button in &released {
            if let Some(serde_json::Value::String(key_string)) = device_mapping.get(*button) {
                if let Some(vk) = get_vk_code(key_string) {
                    simulate_key_up(vk);
                }
            }
        }

        // Broadcast input updates
        if !pressed.is_empty() || !released.is_empty() {
            let mut buttons_map = HashMap::new();
            for name in &current_buttons {
                buttons_map.insert(name.clone(), true);
            }

            let update_msg = serde_json::json!({
                "event": "joycon_update",
                "data": {
                    "id": jc.path.clone(),
                    "type": "input",
                    "buttons": buttons_map
                }
            })
            .to_string();
            let _ = self.state.event_tx.send(update_msg);
        }

        jc.last_button_state = current_buttons;

        // --- 3. Stick parsing ---
        let stick_key = if jc.device_type == "L" { "stick_l" } else { "stick_r" };
        if let Some(stick_val) = device_mapping.get(stick_key) {
            if let Ok(stick_cfg) = serde_json::from_value::<StickConfig>(stick_val.clone()) {
                let (mode, sensitivity, mappings, dials) = match stick_cfg {
                    StickConfig::OldStyle(mode_str) => {
                        (mode_str, default_sensitivity(), HashMap::new(), HashMap::new())
                    }
                    StickConfig::NewStyle {
                        mode,
                        sensitivity,
                        mappings,
                        dials,
                    } => (mode, sensitivity, mappings, dials),
                };

                let x_raw;
                let y_raw;
                if jc.device_type == "L" {
                    x_raw = report[6] as u16 | (((report[7] & 0x0F) as u16) << 8);
                    y_raw = ((report[7] >> 4) as u16) | ((report[8] as u16) << 4);
                } else {
                    x_raw = report[9] as u16 | (((report[10] & 0x0F) as u16) << 8);
                    y_raw = ((report[10] >> 4) as u16) | ((report[11] as u16) << 4);
                }

                let (dx, dy) = process_stick_input(x_raw, y_raw, STICK_DEADZONE);

                if mode == "mouse" {
                    if dx != 0.0 || dy != 0.0 {
                        // Y is inverted: Joy-con up is lower raw value, so we pass -dy to simulate mouse up
                        simulate_mouse_move(
                            (dx * sensitivity as f64) as i32,
                            (-dy * sensitivity as f64) as i32,
                        );
                    }
                } else if mode == "8way" {
                    let dy_inv = -dy;
                    let mut direction = None;
                    let threshold = 0.5;
                    if dy_inv > threshold {
                        if dx > threshold {
                            direction = Some("up_right");
                        } else if dx < -threshold {
                            direction = Some("up_left");
                        } else {
                            direction = Some("up");
                        }
                    } else if dy_inv < -threshold {
                        if dx > threshold {
                            direction = Some("down_right");
                        } else if dx < -threshold {
                            direction = Some("down_left");
                        } else {
                            direction = Some("down");
                        }
                    } else if dx > threshold {
                        direction = Some("right");
                    } else if dx < -threshold {
                        direction = Some("left");
                    }

                    if direction.map(|s| s.to_string()) != jc.last_stick_direction {
                        // Release previous direction key
                        if let Some(ref prev_dir) = jc.last_stick_direction {
                            if let Some(key_str) = mappings.get(prev_dir) {
                                if let Some(vk) = get_vk_code(key_str) {
                                    simulate_key_up(vk);
                                }
                            }
                        }
                        // Press new direction key
                        if let Some(ref new_dir) = direction {
                            if let Some(key_str) = mappings.get(*new_dir) {
                                if let Some(vk) = get_vk_code(key_str) {
                                    simulate_key_down(vk);
                                }
                            }
                        }
                        jc.last_stick_direction = direction.map(|s| s.to_string());
                    }
                } else if mode == "dial" {
                    let dy_inv = -dy;
                    let magnitude = (dx * dx + dy_inv * dy_inv).sqrt();
                    if magnitude < 0.1 {
                        jc.last_stick_sector = None;
                    } else {
                        let angle = dy_inv.atan2(dx);
                        let mut sector = "left";
                        let pi = std::f64::consts::PI;
                        if angle >= pi / 4.0 && angle < 3.0 * pi / 4.0 {
                            sector = "up";
                        } else if angle >= -3.0 * pi / 4.0 && angle < -pi / 4.0 {
                            sector = "down";
                        } else if angle >= -pi / 4.0 && angle < pi / 4.0 {
                            sector = "right";
                        }

                        if Some(sector.to_string()) != jc.last_stick_sector {
                            jc.last_stick_sector = Some(sector.to_string());
                            jc.last_stick_angle = angle;
                        } else {
                            let mut delta_angle = angle - jc.last_stick_angle;
                            if delta_angle > pi {
                                delta_angle -= 2.0 * pi;
                            }
                            if delta_angle < -pi {
                                delta_angle += 2.0 * pi;
                            }

                            let rotation_threshold = 0.2;
                            if let Some(dial_map) = dials.get(sector) {
                                if delta_angle > rotation_threshold {
                                    if let Some(vk) = get_vk_code(&dial_map.increase) {
                                        simulate_key_down(vk);
                                        simulate_key_up(vk);
                                    }
                                    jc.last_stick_angle = angle;
                                } else if delta_angle < -rotation_threshold {
                                    if let Some(vk) = get_vk_code(&dial_map.decrease) {
                                        simulate_key_down(vk);
                                        simulate_key_up(vk);
                                    }
                                    jc.last_stick_angle = angle;
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }
}

// --- WebSocket Connection Handler ---
async fn handle_connection(stream: TcpStream, state: Arc<SharedState>) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Error upgrading to websocket: {:?}", e);
            return;
        }
    };

    let (mut ws_tx, mut ws_rx) = ws_stream.split();
    let (tx_to_ws, mut rx_to_ws) = tokio::sync::mpsc::channel::<Message>(32);

    // Task 1: Write messages to client WebSocket
    tokio::spawn(async move {
        while let Some(msg) = rx_to_ws.recv().await {
            if ws_tx.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Task 2: Listen for broadcast events and forward them to client
    let tx_to_ws_clone = tx_to_ws.clone();
    let mut rx_from_event = state.event_tx.subscribe();
    tokio::spawn(async move {
        while let Ok(msg_str) = rx_from_event.recv().await {
            if tx_to_ws_clone
                .send(Message::Text(msg_str))
                .await
                .is_err()
            {
                break;
            }
        }
    });

    // Send initial list of connected devices
    {
        let devices = state.connected_devices.read().unwrap();
        let initial_devices_msg = serde_json::json!({
            "event": "joycon_devices",
            "data": {
                "devices": &*devices
            }
        })
        .to_string();
        let _ = tx_to_ws.send(Message::Text(initial_devices_msg)).await;
    }

    // Task 3: Read incoming requests from client WebSocket
    while let Some(Ok(msg)) = ws_rx.next().await {
        if let Message::Text(text) = msg {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                if let Some(event) = parsed.get("event").and_then(|e| e.as_str()) {
                    let data = parsed.get("data");
                    match event {
                        "load_joycon_mapping" => {
                            if let Some(device_id) = data
                                .and_then(|d| d.get("deviceId"))
                                .and_then(|id| id.as_str())
                            {
                                let mappings = state.mappings.read().unwrap();
                                let mapping = mappings.get(device_id).cloned().unwrap_or_default();
                                let resp = serde_json::json!({
                                    "event": "joycon_mapping_loaded",
                                    "data": {
                                        "deviceId": device_id,
                                        "mapping": mapping
                                    }
                                })
                                .to_string();
                                let _ = tx_to_ws.send(Message::Text(resp)).await;
                            }
                        }
                        "save_joycon_mapping" => {
                            if let Some(device_id) = data
                                .and_then(|d| d.get("deviceId"))
                                .and_then(|id| id.as_str())
                            {
                                if let Some(mapping_val) = data.and_then(|d| d.get("mapping")) {
                                    if let Ok(mapping_map) = serde_json::from_value::<
                                        HashMap<String, serde_json::Value>,
                                    >(mapping_val.clone())
                                    {
                                        let mut mappings = state.mappings.write().unwrap();
                                        mappings.insert(device_id.to_string(), mapping_map);
                                        save_mapping(&*mappings);

                                        let resp = serde_json::json!({
                                            "event": "joycon_mapping_saved",
                                            "data": {
                                                "status": "success"
                                            }
                                        })
                                        .to_string();
                                        let _ = tx_to_ws.send(Message::Text(resp)).await;
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }
}

// --- Main App Entrypoint ---
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting Joy-Con Utility Rust Backend...");

    let mappings = load_mapping();
    let (event_tx, _) = tokio::sync::broadcast::channel(128);

    let state = Arc::new(SharedState {
        mappings: RwLock::new(mappings),
        connected_devices: RwLock::new(Vec::new()),
        event_tx,
    });

    // Spawn the HID devices loop in a separate native OS thread
    let state_for_manager = Arc::clone(&state);
    std::thread::spawn(move || {
        let manager = JoyconManager {
            state: state_for_manager,
        };
        manager.run();
    });

    // Start WebSocket Server
    let addr = "127.0.0.1:8000";
    let listener = TcpListener::bind(addr).await?;
    println!("WebSocket server running on ws://{}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        let state_for_connection = Arc::clone(&state);
        tokio::spawn(handle_connection(stream, state_for_connection));
    }

    Ok(())
}
