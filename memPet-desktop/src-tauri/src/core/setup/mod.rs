use tauri::{AppHandle, WebviewWindow};

#[cfg(target_os = "macos")]
mod macos;

#[cfg(not(target_os = "macos"))]
pub mod common;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(not(target_os = "macos"))]
pub use common::*;

pub fn default(
    app_handle: &AppHandle,
    main_window: WebviewWindow,
    preference_window: WebviewWindow,
) {
    // DevTools 默认关闭，避免在 macOS Panel + 透明窗口场景下触发 WebKit 不稳定渲染路径。
    // 如需调试请显式设置: MEMPET_OPEN_DEVTOOLS=1
    #[cfg(debug_assertions)]
    if std::env::var("MEMPET_OPEN_DEVTOOLS")
        .map(|value| value == "1")
        .unwrap_or(false)
    {
        main_window.open_devtools();
    }

    platform(app_handle, main_window.clone(), preference_window.clone());
}
