use anyhow::Result;
use chrono::{Duration, Utc};

use crate::db::Db;
use crate::models::*;

pub fn seed_if_empty(db: &Db) -> Result<()> {
    if db.is_seeded() {
        return Ok(());
    }
    println!("[seed] Database empty, seeding mock data...");

    let now = Utc::now().timestamp();

    let projects: Vec<(&str, &str, &str, &str, i64)> = vec![
        ("p_clienta", "客户A 项目", "与客户 A 的合作项目，涉及报价、需求确认和合同", "active", now - 86400),
        ("p_resume", "个人简历更新", "2026 年度简历刷新与求职准备", "active", now - 86400 * 3),
        ("p_python", "Python 学习", "数据结构、算法和 Web 开发学习材料", "active", now - 86400 * 7),
        ("p_paper", "论文复现", "顶会论文复现与实验代码", "active", now - 86400 * 5),
        ("p_photo", "摄影后期", "Lightroom 预设与原片素材", "active", now - 86400 * 14),
        ("p_house", "装修", "新房装修方案、报价、合同", "archived", now - 86400 * 90),
        ("p_finance", "财务记录", "个人收支与发票存档", "active", now - 86400 * 4),
        ("p_design", "设计稿与素材", "UI/UX 设计稿存档", "active", now - 86400 * 10),
    ];

    for (id, name, desc, status, last_active) in &projects {
        let p = Project {
            id: id.to_string(),
            name: name.to_string(),
            description: Some(desc.to_string()),
            status: status.to_string(),
            last_active: *last_active,
            file_count: 0,
            total_size: 0,
            top_files: vec![],
        };
        db.insert_project(&p)?;
    }

    let mut all_files: Vec<FileItem> = Vec::new();

    let clienta_files = vec![
        ("客户A_报价单_v3.pptx", "pptx", 12_400_000, "给客户A的Q1服务报价方案，包含3档套餐和定制选项，重点突出ROI测算。", vec!["客户A", "报价", "方案", "Q1"], 1, 5),
        ("客户A_报价单_v2.pptx", "pptx", 11_800_000, "客户A 报价方案 v2，与 v1 相比调整了套餐定价和服务范围。", vec!["客户A", "报价", "v2"], 7, 2),
        ("客户A_报价单_v1.pptx", "pptx", 10_500_000, "客户A 报价初稿，基于通用模板修改。", vec!["客户A", "报价", "v1"], 14, 1),
        ("客户A_需求确认.docx", "docx", 256_000, "客户A 项目需求文档，明确了 5 项核心需求与交付时间。", vec!["客户A", "需求"], 14, 3),
        ("客户A_合同草案.docx", "docx", 312_000, "客户A 项目合作合同草案，待法务审阅。", vec!["客户A", "合同"], 2, 4),
        ("客户A_kickoff.pdf", "pdf", 1_200_000, "客户A 项目启动会议纪要。", vec!["客户A", "会议"], 20, 1),
        ("通用报价模板.pptx", "pptx", 8_900_000, "通用客户报价 PPT 模板，含 5 种风格主题页。", vec!["模板", "报价"], 30, 8),
        ("客户A_brand_guide.pdf", "pdf", 4_500_000, "客户A 品牌指南文档，包含 logo、配色、字体规范。", vec!["客户A", "品牌"], 25, 2),
        ("客户A_数据分析.xlsx", "xlsx", 890_000, "客户A 行业数据分析，含 3 个 sheet 和透视表。", vec!["客户A", "数据"], 4, 3),
        ("客户A_竞品调研.docx", "docx", 445_000, "客户A 所在赛道的竞品对比分析。", vec!["客户A", "竞品"], 6, 2),
        ("clienta_logo.png", "png", 256_000, "客户A 官方 logo PNG 透明背景版。", vec!["客户A", "logo"], 30, 4),
        ("clienta_logo.svg", "svg", 18_000, "客户A 官方 logo SVG 矢量版。", vec!["客户A", "logo"], 30, 2),
        ("客户A_email_threads.eml", "eml", 78_000, "与客户A的邮件往来导出归档。", vec!["客户A", "邮件"], 5, 1),
        ("微信导出_客户A.txt", "txt", 124_000, "微信与客户A联系人聊天记录导出。", vec!["客户A", "聊天"], 3, 1),
        ("客户A_发票.pdf", "pdf", 234_000, "客户A 项目首期款发票扫描件。", vec!["客户A", "发票"], 10, 1),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in clienta_files {
        all_files.push(make_file("p_clienta", name, ext, size, summary, tags, days_ago, access));
    }

    let resume_files = vec![
        ("简历_最新版.pdf", "pdf", 380_000, "2026 版个人简历，5 年产品经验，主攻 AI 方向。", vec!["简历", "求职"], 3, 8),
        ("简历_v5.docx", "docx", 142_000, "简历 v5 版本，调整了项目经历部分。", vec!["简历", "v5"], 5, 3),
        ("简历_v4.docx", "docx", 138_000, "简历 v4 版本。", vec!["简历", "v4"], 12, 1),
        ("cover_letter_AI公司.docx", "docx", 32_000, "给 AI 创业公司的求职信，强调 LLM 产品经验。", vec!["求职", "cover letter"], 4, 4),
        ("作品集_2026.pdf", "pdf", 24_000_000, "近 3 年产品作品集，含 5 个核心项目案例。", vec!["作品集", "求职"], 7, 5),
        ("面试题目准备.md", "md", 18_000, "PM 高频面试题与回答框架整理。", vec!["面试", "准备"], 2, 6),
        ("公司list_2026.xlsx", "xlsx", 56_000, "目标公司清单与投递状态追踪。", vec!["求职", "公司"], 1, 7),
        ("推荐信_张总.pdf", "pdf", 245_000, "前老板张总的英文推荐信。", vec!["推荐信", "求职"], 30, 2),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in resume_files {
        all_files.push(make_file("p_resume", name, ext, size, summary, tags, days_ago, access));
    }

    let python_files = vec![
        ("Python基础笔记.md", "md", 86_000, "Python 入门到进阶的学习笔记，包含函数、类、装饰器、异步等。", vec!["Python", "笔记"], 7, 12),
        ("算法练习_leetcode.py", "py", 24_000, "LeetCode 高频题解，按数据结构分类组织。", vec!["算法", "leetcode"], 2, 8),
        ("Django入门教程.pdf", "pdf", 8_900_000, "Django Web 框架入门教程电子书。", vec!["Python", "Django"], 14, 3),
        ("Flask_demo项目.zip", "zip", 4_200_000, "跟着教程做的 Flask 博客系统 demo。", vec!["Python", "Flask"], 21, 1),
        ("爬虫_豆瓣Top250.py", "py", 8_000, "爬取豆瓣电影 Top250 的脚本，使用 requests + BeautifulSoup。", vec!["爬虫", "Python"], 30, 2),
        ("数据分析_pandas练习.ipynb", "ipynb", 145_000, "Pandas 数据分析练习 notebook，含 10 个真实数据集。", vec!["数据分析", "pandas"], 10, 5),
        ("机器学习入门.pdf", "pdf", 12_000_000, "Andrew Ng 机器学习课程讲义中文版。", vec!["机器学习", "笔记"], 60, 1),
        ("深度学习_PyTorch实战.pdf", "pdf", 18_000_000, "PyTorch 深度学习实战书，含 10 个项目案例。", vec!["深度学习", "PyTorch"], 45, 2),
        ("LLM学习笔记.md", "md", 142_000, "大语言模型学习笔记，涵盖 Transformer、RLHF、提示工程。", vec!["LLM", "笔记"], 5, 9),
        ("transformer实现.py", "py", 32_000, "从零实现一个简化版 Transformer，注释详细。", vec!["LLM", "实现"], 8, 4),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in python_files {
        all_files.push(make_file("p_python", name, ext, size, summary, tags, days_ago, access));
    }

    let paper_files = vec![
        ("Attention_Is_All_You_Need.pdf", "pdf", 2_400_000, "Transformer 原始论文 (2017)，注意力机制开山之作。", vec!["论文", "LLM"], 5, 8),
        ("GPT-3_paper.pdf", "pdf", 4_800_000, "GPT-3 论文，少样本学习能力。", vec!["论文", "GPT"], 5, 5),
        ("BERT_paper.pdf", "pdf", 1_900_000, "BERT 论文，双向编码器表示。", vec!["论文", "BERT"], 12, 3),
        ("attention_pytorch复现.py", "py", 28_000, "用 PyTorch 复现 Attention is All You Need 论文。", vec!["复现", "PyTorch"], 5, 6),
        ("bert_finetune实验.ipynb", "ipynb", 245_000, "BERT 在情感分类任务上的微调实验。", vec!["复现", "BERT"], 12, 4),
        ("实验数据.csv", "csv", 1_400_000, "复现实验所用的训练/验证集数据。", vec!["数据", "实验"], 8, 3),
        ("实验结果对比.xlsx", "xlsx", 78_000, "复现结果与原论文数据对比表。", vec!["实验", "结果"], 5, 5),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in paper_files {
        all_files.push(make_file("p_paper", name, ext, size, summary, tags, days_ago, access));
    }

    let photo_files = vec![
        ("preset_森系.xmp", "xmp", 12_000, "森系绿色调 Lightroom 预设。", vec!["预设", "森系"], 14, 3),
        ("preset_胶片.xmp", "xmp", 14_000, "复古胶片质感 Lightroom 预设。", vec!["预设", "胶片"], 14, 5),
        ("RAW_樱花_001.cr2", "cr2", 25_000_000, "樱花季佳能 RAW 原片 001。", vec!["RAW", "樱花"], 30, 2),
        ("RAW_樱花_002.cr2", "cr2", 24_500_000, "樱花季佳能 RAW 原片 002。", vec!["RAW", "樱花"], 30, 1),
        ("RAW_樱花_003.cr2", "cr2", 26_100_000, "樱花季佳能 RAW 原片 003。", vec!["RAW", "樱花"], 30, 1),
        ("output_樱花精修.jpg", "jpg", 4_500_000, "樱花精修成片，胶片预设处理。", vec!["成片", "樱花"], 28, 12),
        ("摄影笔记.md", "md", 24_000, "构图、用光、后期心得笔记。", vec!["摄影", "笔记"], 14, 4),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in photo_files {
        all_files.push(make_file("p_photo", name, ext, size, summary, tags, days_ago, access));
    }

    let house_files = vec![
        ("装修预算表.xlsx", "xlsx", 124_000, "全屋装修预算明细表，含硬装、软装、家电。", vec!["装修", "预算"], 90, 1),
        ("装修合同.pdf", "pdf", 1_800_000, "与装修公司签订的工程合同扫描件。", vec!["装修", "合同"], 100, 1),
        ("户型图.pdf", "pdf", 3_400_000, "新房原始户型图与改造方案。", vec!["装修", "户型"], 120, 2),
        ("家具清单.docx", "docx", 56_000, "全屋家具采购清单与价格对比。", vec!["装修", "家具"], 80, 1),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in house_files {
        all_files.push(make_file("p_house", name, ext, size, summary, tags, days_ago, access));
    }

    let finance_files = vec![
        ("2026年1月账单.xlsx", "xlsx", 45_000, "2026 年 1 月个人收支明细。", vec!["财务", "账单"], 100, 2),
        ("2026年2月账单.xlsx", "xlsx", 48_000, "2026 年 2 月个人收支明细。", vec!["财务", "账单"], 70, 2),
        ("2026年3月账单.xlsx", "xlsx", 52_000, "2026 年 3 月个人收支明细。", vec!["财务", "账单"], 45, 3),
        ("2026年4月账单.xlsx", "xlsx", 49_000, "2026 年 4 月个人收支明细。", vec!["财务", "账单"], 15, 4),
        ("发票_出租车.pdf", "pdf", 142_000, "本月出租车电子发票合集。", vec!["发票", "出行"], 4, 1),
        ("发票_餐饮.pdf", "pdf", 234_000, "本月餐饮发票合集，用于公司报销。", vec!["发票", "餐饮"], 4, 2),
        ("年终奖税务规划.docx", "docx", 28_000, "年终奖个税计算与发放方式选择。", vec!["财务", "税务"], 60, 3),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in finance_files {
        all_files.push(make_file("p_finance", name, ext, size, summary, tags, days_ago, access));
    }

    let design_files = vec![
        ("UI_组件库_v2.fig", "fig", 18_000_000, "内部产品 UI 组件库 v2 版 Figma 源文件。", vec!["设计", "组件库"], 10, 6),
        ("dashboard_设计稿.fig", "fig", 24_000_000, "管理后台 Dashboard 设计稿。", vec!["设计", "Dashboard"], 14, 4),
        ("移动端_设计稿.sketch", "sketch", 32_000_000, "移动 App 完整设计稿 Sketch 源文件。", vec!["设计", "移动端"], 30, 2),
        ("图标库.svg", "svg", 245_000, "自制 200+ SVG 图标库。", vec!["设计", "图标"], 60, 5),
    ];
    for (name, ext, size, summary, tags, days_ago, access) in design_files {
        all_files.push(make_file("p_design", name, ext, size, summary, tags, days_ago, access));
    }

    let temp_files: Vec<(&str, &str, i64, i64, i64)> = vec![
        ("setup_chrome_v122.dmg", "dmg", 180_000_000, 200, 0),
        ("zoom_installer.dmg", "dmg", 92_000_000, 220, 0),
        ("VSCode-darwin-arm64.zip", "zip", 145_000_000, 180, 0),
        ("微信安装包.dmg", "dmg", 220_000_000, 195, 0),
        ("nodejs-v20.tar.gz", "gz", 45_000_000, 365, 0),
        ("python3.12.pkg", "pkg", 65_000_000, 280, 0),
        ("IMG_0123.HEIC", "heic", 4_200_000, 195, 0),
        ("IMG_0124.HEIC", "heic", 3_900_000, 195, 0),
        ("IMG_0125.HEIC", "heic", 4_500_000, 195, 0),
        ("截屏 2025-11-15 14.23.png", "png", 1_200_000, 185, 0),
        ("截屏 2025-11-16 09.42.png", "png", 1_400_000, 184, 0),
        ("截屏 2025-12-01 16.55.png", "png", 1_100_000, 169, 0),
        ("某网站_条款.pdf", "pdf", 890_000, 220, 0),
        ("产品手册_未读.pdf", "pdf", 3_400_000, 240, 0),
        ("快递单号.txt", "txt", 4_000, 200, 0),
    ];
    for (name, ext, size, days_ago, access) in temp_files {
        all_files.push(FileItem {
            id: format!("f_temp_{}", uuid_like(name)),
            name: name.to_string(),
            path: format!("~/Downloads/{}", name),
            ext: ext.to_string(),
            size,
            mtime: (Utc::now() - Duration::days(days_ago)).timestamp(),
            mime_type: mime_from_ext(ext).to_string(),
            summary: None,
            tags: vec!["临时".to_string(), "Downloads".to_string()],
            project_id: None,
            project_name: None,
            access_count: access,
        });
    }

    for f in &all_files {
        let is_temp = f.project_id.is_none();
        db.insert_file(f, is_temp)?;
    }

    let ca_v3 = all_files.iter().find(|f| f.name.contains("v3.pptx") && f.name.contains("客户A")).map(|f| f.id.clone());
    let ca_v2 = all_files.iter().find(|f| f.name.contains("v2.pptx") && f.name.contains("客户A")).map(|f| f.id.clone());
    let ca_v1 = all_files.iter().find(|f| f.name.contains("v1.pptx") && f.name.contains("客户A")).map(|f| f.id.clone());
    let ca_tpl = all_files.iter().find(|f| f.name.contains("通用报价模板")).map(|f| f.id.clone());
    let ca_req = all_files.iter().find(|f| f.name.contains("需求确认")).map(|f| f.id.clone());
    let ca_contract = all_files.iter().find(|f| f.name.contains("合同草案")).map(|f| f.id.clone());

    if let (Some(v3), Some(v2)) = (&ca_v3, &ca_v2) {
        db.insert_relation(v3, v2, "derived", 0.9)?;
    }
    if let (Some(v2), Some(v1)) = (&ca_v2, &ca_v1) {
        db.insert_relation(v2, v1, "derived", 0.9)?;
    }
    if let (Some(v3), Some(tpl)) = (&ca_v3, &ca_tpl) {
        db.insert_relation(v3, tpl, "derived", 0.7)?;
    }
    if let (Some(v3), Some(req)) = (&ca_v3, &ca_req) {
        db.insert_relation(v3, req, "reference", 0.8)?;
    }
    if let (Some(v3), Some(c)) = (&ca_v3, &ca_contract) {
        db.insert_relation(v3, c, "co-project", 0.6)?;
    }

    let resume_v5 = all_files.iter().find(|f| f.name.contains("简历_v5")).map(|f| f.id.clone());
    let resume_v4 = all_files.iter().find(|f| f.name.contains("简历_v4")).map(|f| f.id.clone());
    let resume_latest = all_files.iter().find(|f| f.name.contains("简历_最新版")).map(|f| f.id.clone());
    if let (Some(a), Some(b)) = (&resume_latest, &resume_v5) {
        db.insert_relation(a, b, "derived", 0.9)?;
    }
    if let (Some(a), Some(b)) = (&resume_v5, &resume_v4) {
        db.insert_relation(a, b, "derived", 0.9)?;
    }

    let llm_note = all_files.iter().find(|f| f.name.contains("LLM学习笔记")).map(|f| f.id.clone());
    let transformer = all_files.iter().find(|f| f.name.contains("transformer实现")).map(|f| f.id.clone());
    let attention_paper = all_files.iter().find(|f| f.name.contains("Attention_Is_All_You_Need")).map(|f| f.id.clone());
    if let (Some(a), Some(b)) = (&llm_note, &attention_paper) {
        db.insert_relation(a, b, "reference", 0.85)?;
    }
    if let (Some(a), Some(b)) = (&transformer, &attention_paper) {
        db.insert_relation(a, b, "derived", 0.95)?;
    }

    println!("[seed] Done: {} projects, {} files.", projects.len(), all_files.len());
    Ok(())
}

fn make_file(
    project_id: &str,
    name: &str,
    ext: &str,
    size: i64,
    summary: &str,
    tags: Vec<&str>,
    days_ago: i64,
    access: i64,
) -> FileItem {
    let path = match project_id {
        "p_clienta" => format!("~/Documents/工作/2026/客户A/{}", name),
        "p_resume" => format!("~/Documents/求职/2026/{}", name),
        "p_python" => format!("~/Documents/学习/Python/{}", name),
        "p_paper" => format!("~/Documents/研究/论文复现/{}", name),
        "p_photo" => format!("~/Pictures/2026樱花/{}", name),
        "p_house" => format!("~/Documents/生活/装修/{}", name),
        "p_finance" => format!("~/Documents/财务/2026/{}", name),
        "p_design" => format!("~/Documents/设计/{}", name),
        _ => format!("~/Documents/{}", name),
    };
    FileItem {
        id: format!("f_{}", uuid_like(name)),
        name: name.to_string(),
        path,
        ext: ext.to_string(),
        size,
        mtime: (Utc::now() - Duration::days(days_ago)).timestamp(),
        mime_type: mime_from_ext(ext).to_string(),
        summary: Some(summary.to_string()),
        tags: tags.iter().map(|s| s.to_string()).collect(),
        project_id: Some(project_id.to_string()),
        project_name: None,
        access_count: access,
    }
}

fn mime_from_ext(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "pdf" => "application/pdf",
        "docx" | "doc" => "application/msword",
        "pptx" | "ppt" => "application/vnd.ms-powerpoint",
        "xlsx" | "xls" => "application/vnd.ms-excel",
        "csv" => "text/csv",
        "txt" | "md" => "text/plain",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "heic" => "image/heic",
        "cr2" => "image/x-canon-cr2",
        "mp4" => "video/mp4",
        "mp3" => "audio/mpeg",
        "zip" => "application/zip",
        "tar" | "gz" => "application/x-tar",
        "dmg" => "application/x-apple-diskimage",
        "pkg" => "application/x-newton-compatible-pkg",
        "py" => "text/x-python",
        "ipynb" => "application/x-ipynb+json",
        "ts" | "tsx" => "text/typescript",
        "js" | "jsx" => "text/javascript",
        "rs" => "text/x-rust",
        "fig" => "application/x-figma",
        "sketch" => "application/x-sketch",
        "eml" => "message/rfc822",
        "xmp" => "application/rdf+xml",
        _ => "application/octet-stream",
    }
}

fn uuid_like(s: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    s.hash(&mut h);
    format!("{:x}", h.finish())
}
