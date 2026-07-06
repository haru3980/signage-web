// schema.js
// SIGNAGE_CONFIG_DATA のスキーマ検証を行うモジュール。
// 外部バリデーションライブラリに依存せず、仕様書 §3 のスキーマに
// 忠実な手書きバリデーションを行う(依存を最小限にするための意図的な選択)。

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

function validateScheduleItem(item, index) {
  const errors = [];
  const prefix = `schedules[${index}]`;

  if (typeof item !== "object" || item === null) {
    return [`${prefix} はオブジェクトである必要があります`];
  }
  if (!isNonEmptyString(item.id)) {
    errors.push(`${prefix}.id は必須の文字列です`);
  }
  if (!isNonEmptyString(item.name)) {
    errors.push(`${prefix}.name は必須の文字列です`);
  }
  if (typeof item.enabled !== "boolean") {
    errors.push(`${prefix}.enabled は真偽値である必要があります`);
  }
  if (
    !Array.isArray(item.target_days) ||
    item.target_days.length !== 7 ||
    !item.target_days.every((d) => typeof d === "boolean")
  ) {
    errors.push(`${prefix}.target_days は真偽値7要素の配列である必要があります(月〜日)`);
  }
  if (!isNonEmptyString(item.sleep_time) || !TIME_RE.test(item.sleep_time)) {
    errors.push(`${prefix}.sleep_time は "HH:MM" 形式である必要があります`);
  }
  if (!isNonEmptyString(item.wake_time) || !TIME_RE.test(item.wake_time)) {
    errors.push(`${prefix}.wake_time は "HH:MM" 形式である必要があります`);
  }
  return errors;
}

/**
 * 設定オブジェクト全体を検証する。
 * @param {*} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSettings(config) {
  const errors = [];

  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return { valid: false, errors: ["リクエストボディはオブジェクトである必要があります"] };
  }

  if (!Array.isArray(config.playlist_urls)) {
    errors.push("playlist_urls は配列である必要があります");
  } else if (!config.playlist_urls.every((u) => isNonEmptyString(u))) {
    errors.push("playlist_urls の各要素は空でない文字列である必要があります");
  }

  if (!Array.isArray(config.schedules)) {
    errors.push("schedules は配列である必要があります");
  } else {
    config.schedules.forEach((item, i) => {
      errors.push(...validateScheduleItem(item, i));
    });
  }

  return { valid: errors.length === 0, errors };
}

const DEFAULT_SETTINGS = {
  playlist_urls: [],
  schedules: [],
};

module.exports = { validateSettings, DEFAULT_SETTINGS };
