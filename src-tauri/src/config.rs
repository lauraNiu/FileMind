use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UserProfile {
    pub name: String,
    pub avatar_initial: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub model: String,
    pub api_key: String,
    pub budget_yuan: f64,
    pub provider: String,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            model: "glm-4-air".to_string(),
            api_key: String::new(),
            budget_yuan: 30.0,
            provider: "zhipu".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScanConfig {
    pub excluded_dirs: Vec<String>,
    pub sensitive_dirs: Vec<String>,
    pub max_files_per_scan: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub profile: UserProfile,
    pub ai: AiConfig,
    pub scan: ScanConfig,
    pub theme: String,
    pub onboarded: bool,
}

pub struct ConfigStore {
    path: PathBuf,
    inner: RwLock<AppConfig>,
}

impl ConfigStore {
    pub fn load(path: PathBuf) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let inner = if path.exists() {
            let text = std::fs::read_to_string(&path)?;
            serde_json::from_str::<AppConfig>(&text).unwrap_or_default()
        } else {
            AppConfig {
                ai: AiConfig::default(),
                scan: ScanConfig {
                    excluded_dirs: vec![
                        "node_modules".into(),
                        "target".into(),
                        ".git".into(),
                        "dist".into(),
                    ],
                    sensitive_dirs: vec![],
                    max_files_per_scan: 5000,
                },
                theme: "dark".into(),
                ..Default::default()
            }
        };
        Ok(Self {
            path,
            inner: RwLock::new(inner),
        })
    }

    pub fn get(&self) -> AppConfig {
        self.inner.read().unwrap().clone()
    }

    pub fn save(&self, cfg: AppConfig) -> Result<()> {
        let json = serde_json::to_string_pretty(&cfg)?;
        std::fs::write(&self.path, json)?;
        *self.inner.write().unwrap() = cfg;
        Ok(())
    }

    pub fn update<F>(&self, f: F) -> Result<AppConfig>
    where
        F: FnOnce(&mut AppConfig),
    {
        let mut cfg = self.get();
        f(&mut cfg);
        self.save(cfg.clone())?;
        Ok(cfg)
    }

    pub fn clear(&self) -> Result<()> {
        if self.path.exists() {
            std::fs::remove_file(&self.path)?;
        }
        *self.inner.write().unwrap() = AppConfig::default();
        Ok(())
    }

    pub fn safe_view(&self) -> AppConfig {
        let mut cfg = self.get();
        if !cfg.ai.api_key.is_empty() {
            let masked = if cfg.ai.api_key.len() > 8 {
                format!("{}…{}", &cfg.ai.api_key[..6], &cfg.ai.api_key[cfg.ai.api_key.len() - 4..])
            } else {
                "****".to_string()
            };
            cfg.ai.api_key = masked;
        }
        cfg
    }
}
