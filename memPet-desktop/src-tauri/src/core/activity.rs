use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveAppSnapshot {
    pub available: bool,
    pub app_name: String,
    pub window_title: String,
    pub process_path: String,
    pub process_id: Option<u32>,
    pub captured_at_ms: u128,
    pub error: Option<String>,
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[command]
pub async fn active_app_snapshot() -> Result<ActiveAppSnapshot, String> {
    let captured_at_ms = now_ms();
    match active_win_pos_rs::get_active_window() {
        Ok(active_window) => Ok(ActiveAppSnapshot {
            available: true,
            app_name: active_window.app_name,
            window_title: active_window.title,
            process_path: active_window.process_path.to_string_lossy().to_string(),
            process_id: u32::try_from(active_window.process_id).ok(),
            captured_at_ms,
            error: None,
        }),
        Err(_) => Ok(ActiveAppSnapshot {
            available: false,
            app_name: "Unknown".to_string(),
            window_title: String::new(),
            process_path: String::new(),
            process_id: None,
            captured_at_ms,
            error: Some("active window unavailable".to_string()),
        }),
    }
}
