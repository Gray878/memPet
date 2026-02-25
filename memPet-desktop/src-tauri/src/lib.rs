mod core;
mod utils;

use core::{
    activity::active_app_snapshot,
    device::start_device_listening,
    gamepad::{start_gamepad_listing, stop_gamepad_listing},
    prevent_default, setup,
};
use serde::Serialize;
use std::{
    collections::VecDeque,
    io::{BufRead, BufReader, Read},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
};
use tauri::path::BaseDirectory;
use tauri::{Manager, WindowEvent, generate_handler};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_custom_window::{
    MAIN_WINDOW_LABEL, PREFERENCE_WINDOW_LABEL, show_preference_window,
};
use utils::fs_extra::copy_dir;

const BACKEND_URL: &str = "http://127.0.0.1:8000";
const MAX_BACKEND_LOGS: usize = 500;

struct BackendState {
    process: Mutex<Option<Child>>,
    logs: Arc<Mutex<VecDeque<String>>>,
    mode: Mutex<String>,
}

impl Default for BackendState {
    fn default() -> Self {
        Self {
            process: Mutex::new(None),
            logs: Arc::new(Mutex::new(VecDeque::new())),
            mode: Mutex::new("stopped".to_string()),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendStatus {
    running: bool,
    pid: Option<u32>,
    mode: String,
    url: String,
}

fn status_response(running: bool, pid: Option<u32>, mode: String) -> BackendStatus {
    BackendStatus {
        running,
        pid,
        mode,
        url: BACKEND_URL.to_string(),
    }
}

fn push_backend_log(logs: &Arc<Mutex<VecDeque<String>>>, line: impl Into<String>) {
    if let Ok(mut guard) = logs.lock() {
        guard.push_back(line.into());
        while guard.len() > MAX_BACKEND_LOGS {
            guard.pop_front();
        }
    }
}

fn spawn_log_reader<R: Read + Send + 'static>(
    reader: R,
    logs: Arc<Mutex<VecDeque<String>>>,
    source: &'static str,
) {
    std::thread::spawn(move || {
        let buffered = BufReader::new(reader);
        for line in buffered.lines() {
            match line {
                Ok(text) if !text.is_empty() => {
                    push_backend_log(&logs, format!("[{source}] {text}"))
                }
                Ok(_) => {}
                Err(err) => {
                    push_backend_log(&logs, format!("[{source}] 日志读取失败: {err}"));
                    break;
                }
            }
        }
    });
}

fn resolve_dev_backend_dir() -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    if let Ok(dir) = std::env::var("MEMPET_SERVER_DIR") {
        candidates.push(PathBuf::from(dir));
    }

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("../../memPet-server"));
        candidates.push(cwd.join("../memPet-server"));
        candidates.push(cwd.join("memPet-server"));
    }

    for candidate in candidates {
        if candidate.join("app/main.py").exists() {
            return candidate
                .canonicalize()
                .or_else(|_| Ok(candidate))
                .map_err(|err: std::io::Error| format!("解析后端目录失败: {err}"));
        }
    }

    Err("未找到 memPet-server 目录，请设置 MEMPET_SERVER_DIR".to_string())
}

fn resolve_production_backend_binary(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(custom_path) = std::env::var("MEMPET_SERVER_BIN") {
        let path = PathBuf::from(custom_path);
        if path.exists() {
            return Ok(path);
        }
    }

    let exe_suffix = std::env::consts::EXE_SUFFIX;
    let mut candidates = Vec::new();

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join(format!("memPet-server{exe_suffix}")));
            let platform_triples: &[&str] = match std::env::consts::OS {
                "macos" => &["aarch64-apple-darwin", "x86_64-apple-darwin"],
                "windows" => &["x86_64-pc-windows-msvc", "aarch64-pc-windows-msvc"],
                "linux" => &["x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu"],
                _ => &[],
            };
            for triple in platform_triples {
                candidates.push(exe_dir.join(format!("memPet-server-{triple}{exe_suffix}")));
            }
        }
    }

    let base_name = format!("binaries/memPet-server{exe_suffix}");
    if let Ok(path) = app.path().resolve(&base_name, BaseDirectory::Resource) {
        candidates.push(path);
    }

    let resource_triples: &[&str] = match std::env::consts::OS {
        "macos" => &["aarch64-apple-darwin", "x86_64-apple-darwin"],
        "windows" => &["x86_64-pc-windows-msvc", "aarch64-pc-windows-msvc"],
        "linux" => &["x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu"],
        _ => &[],
    };
    for triple in resource_triples {
        let file_name = format!("binaries/memPet-server-{triple}{exe_suffix}");
        if let Ok(path) = app.path().resolve(file_name, BaseDirectory::Resource) {
            candidates.push(path);
        }
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "未找到生产环境 sidecar 可执行文件，请检查 externalBin 配置".to_string())
}

fn resolve_backend_command(
    app: &tauri::AppHandle,
) -> Result<(String, Vec<String>, Option<PathBuf>, String), String> {
    if cfg!(debug_assertions) {
        let cwd = resolve_dev_backend_dir()?;
        let args = vec![
            "run".to_string(),
            "fastapi".to_string(),
            "dev".to_string(),
            "app/main.py".to_string(),
            "--host".to_string(),
            "127.0.0.1".to_string(),
            "--port".to_string(),
            "8000".to_string(),
        ];
        return Ok(("uv".to_string(), args, Some(cwd), "dev".to_string()));
    }

    let binary = resolve_production_backend_binary(app)?;
    Ok((
        binary.to_string_lossy().to_string(),
        vec![],
        None,
        "production".to_string(),
    ))
}

#[tauri::command]
fn start_backend(
    app: tauri::AppHandle,
    state: tauri::State<'_, BackendState>,
) -> Result<BackendStatus, String> {
    {
        let mut guard = state
            .process
            .lock()
            .map_err(|_| "后端进程锁已损坏".to_string())?;
        if let Some(child) = guard.as_mut() {
            match child.try_wait() {
                Ok(None) => {
                    let mode = state
                        .mode
                        .lock()
                        .map_err(|_| "后端模式锁已损坏".to_string())?
                        .clone();
                    return Ok(status_response(true, Some(child.id()), mode));
                }
                Ok(Some(status)) => {
                    push_backend_log(
                        &state.logs,
                        format!("[backend] 检测到已退出旧进程，退出码: {status}"),
                    );
                    *guard = None;
                }
                Err(err) => return Err(format!("检查后端进程状态失败: {err}")),
            }
        }
    }

    let (program, args, cwd, mode) = resolve_backend_command(&app)?;
    let mut command = Command::new(&program);
    command.args(&args);
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }

    let mut child = command
        .spawn()
        .map_err(|err| format!("启动后端失败: {err} (cmd={program})"))?;
    let pid = child.id();

    if let Some(stdout) = child.stdout.take() {
        spawn_log_reader(stdout, state.logs.clone(), "backend:stdout");
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_log_reader(stderr, state.logs.clone(), "backend:stderr");
    }

    {
        let mut guard = state
            .process
            .lock()
            .map_err(|_| "后端进程锁已损坏".to_string())?;
        *guard = Some(child);
    }
    {
        let mut mode_guard = state
            .mode
            .lock()
            .map_err(|_| "后端模式锁已损坏".to_string())?;
        *mode_guard = mode.clone();
    }

    push_backend_log(
        &state.logs,
        format!("[backend] 已启动 pid={pid} mode={mode} url={BACKEND_URL}"),
    );
    Ok(status_response(true, Some(pid), mode))
}

#[tauri::command]
fn stop_backend(state: tauri::State<'_, BackendState>) -> Result<BackendStatus, String> {
    let mut stopped_pid = None;
    {
        let mut guard = state
            .process
            .lock()
            .map_err(|_| "后端进程锁已损坏".to_string())?;
        if let Some(mut child) = guard.take() {
            stopped_pid = Some(child.id());
            if let Err(err) = child.kill() {
                push_backend_log(&state.logs, format!("[backend] 停止进程失败: {err}"));
            }
            let _ = child.wait();
        }
    }
    {
        let mut mode_guard = state
            .mode
            .lock()
            .map_err(|_| "后端模式锁已损坏".to_string())?;
        *mode_guard = "stopped".to_string();
    }
    push_backend_log(
        &state.logs,
        format!(
            "[backend] 已停止 pid={}",
            stopped_pid.map_or_else(|| "N/A".to_string(), |v| v.to_string())
        ),
    );
    Ok(status_response(false, None, "stopped".to_string()))
}

#[tauri::command]
fn backend_status(state: tauri::State<'_, BackendState>) -> Result<BackendStatus, String> {
    let mut running = false;
    let mut pid = None;
    let mut exit_log = None;

    {
        let mut guard = state
            .process
            .lock()
            .map_err(|_| "后端进程锁已损坏".to_string())?;
        if let Some(child) = guard.as_mut() {
            match child.try_wait() {
                Ok(None) => {
                    running = true;
                    pid = Some(child.id());
                }
                Ok(Some(status)) => {
                    exit_log = Some(format!("[backend] 进程已退出: {status}"));
                    *guard = None;
                }
                Err(err) => return Err(format!("读取后端进程状态失败: {err}")),
            }
        }
    }

    let mode = {
        let mut mode_guard = state
            .mode
            .lock()
            .map_err(|_| "后端模式锁已损坏".to_string())?;
        if running {
            mode_guard.clone()
        } else {
            *mode_guard = "stopped".to_string();
            mode_guard.clone()
        }
    };

    if let Some(log) = exit_log {
        push_backend_log(&state.logs, log);
    }

    Ok(status_response(running, pid, mode))
}

#[tauri::command]
fn backend_logs(
    lines: Option<usize>,
    state: tauri::State<'_, BackendState>,
) -> Result<Vec<String>, String> {
    let count = lines.unwrap_or(200).clamp(1, MAX_BACKEND_LOGS);
    let guard = state
        .logs
        .lock()
        .map_err(|_| "后端日志锁已损坏".to_string())?;
    let start = guard.len().saturating_sub(count);
    Ok(guard.iter().skip(start).cloned().collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(BackendState::default())
        .setup(|app| {
            let app_handle = app.handle();

            let main_window = app.get_webview_window(MAIN_WINDOW_LABEL).unwrap();

            let preference_window = app.get_webview_window(PREFERENCE_WINDOW_LABEL).unwrap();

            setup::default(&app_handle, main_window.clone(), preference_window.clone());

            Ok(())
        })
        .invoke_handler(generate_handler![
            copy_dir,
            start_device_listening,
            start_gamepad_listing,
            stop_gamepad_listing,
            active_app_snapshot,
            start_backend,
            stop_backend,
            backend_status,
            backend_logs
        ])
        .plugin(tauri_plugin_custom_window::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pinia::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(prevent_default::init())
        .plugin(tauri_plugin_single_instance::init(
            |app_handle, _argv, _cwd| {
                show_preference_window(app_handle);
            },
        ))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("tao", log::LevelFilter::Warn)
                .level_for("wry", log::LevelFilter::Warn)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .filter(|metadata| !metadata.target().contains("gilrs"))
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_macos_permissions::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_locale::init())
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                let _ = window.hide();

                api.prevent_close();
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, event| match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => {
            show_preference_window(app_handle);
        }
        _ => {
            let _ = app_handle;
        }
    });
}
