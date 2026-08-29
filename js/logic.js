/**
 * 日傘・雨傘の5段階判定ロジック
 *
 * fetchWeatherData() が返す hourly データ（precipitation / uv_index / weather_code）を使い、
 * 東京時間の「現在時刻以降〜本日終了」の予報からレベルとメッセージを算出する。
 */

const PARASOL_MESSAGES = {
  1: "日傘は不要です。今日はこの先、紫外線が弱めです。",
  2: "短時間の外出なら日傘なしでも大丈夫です。",
  3: "日差しが出る時間帯は、日傘があると安心です。",
  4: "しっかり日差し対策！日傘を持って出かけましょう。",
  5: "紫外線が非常に強いです。日傘必須、帽子や日焼け止めも併用を。",
};

const UMBRELLA_MESSAGES = {
  1: "雨傘は不要です。この先、降水の心配は少なめです。",
  2: "急な雨に備えて、折りたたみ傘があると安心です。",
  3: "折りたたみ傘があると安心。雨の降る時間帯がありそうです。",
  4: "雨が降りそうです。傘を持って出かけましょう。",
  5: "しっかりした傘が必要です。強い雨の予想です。",
};

const FALLBACK_RESULT = {
  level: 1,
  stars: "★ ☆ ☆ ☆ ☆",
  message: "天気データを取得できませんでした。",
};

/**
 * レベル（1〜5）を ★／☆ の表示用文字列に変換する
 * @param {number} level
 * @returns {string} 例: "★ ★ ★ ☆ ☆"
 */
function toStarDisplay(level) {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  return `${"★ ".repeat(clamped)}${"☆ ".repeat(5 - clamped)}`.trim();
}

/**
 * 東京時間の現在日付・時を返す
 * @returns {{ date: string, hour: number }} date は YYYY-MM-DD
 */
function getTokyoNowParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const valueOf = (type) => parts.find((part) => part.type === type).value;

  return {
    date: `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`,
    hour: Number(valueOf("hour")),
  };
}

/**
 * 現在時刻以降の「本日」時系列だけを取り出す
 * @param {Object} hourly - Open-Meteo の hourly オブジェクト
 * @returns {Array<{ time: string, precipitation: number, uvIndex: number, weatherCode: number }>}
 */
function extractRemainingTodaySamples(hourly) {
  if (!hourly || !Array.isArray(hourly.time)) {
    return [];
  }

  const { date: today, hour: currentHour } = getTokyoNowParts();
  const samples = [];

  for (let i = 0; i < hourly.time.length; i += 1) {
    const time = hourly.time[i];
    if (typeof time !== "string" || time.length < 13) {
      continue;
    }

    const date = time.slice(0, 10);
    const hour = Number(time.slice(11, 13));
    if (date !== today || hour < currentHour) {
      continue;
    }

    samples.push({
      time,
      precipitation: Number(hourly.precipitation?.[i]) || 0,
      uvIndex: Number(hourly.uv_index?.[i]) || 0,
      weatherCode: Number(hourly.weather_code?.[i]) || 0,
    });
  }

  return samples;
}

/**
 * UVインデックス（WHO目安）から日傘レベルを決める
 * @param {number} uvIndex
 * @returns {number} 1〜5
 */
function parasolLevelFromUv(uvIndex) {
  if (uvIndex >= 10) return 5;
  if (uvIndex >= 7) return 4;
  if (uvIndex >= 5) return 3;
  if (uvIndex >= 3) return 2;
  return 1;
}

/**
 * 1時間あたりの降水量（mm）から雨傘レベルを決める
 * @param {number} mm
 * @returns {number} 1〜5
 */
function umbrellaLevelFromPrecipitation(mm) {
  if (mm >= 4) return 5;
  if (mm >= 1.5) return 4;
  if (mm >= 0.5) return 3;
  if (mm > 0) return 2;
  return 1;
}

/**
 * WMO天気コードから雨傘レベルを決める（降水量が少なくても雨マークなら底上げする）
 * @param {number} code
 * @returns {number} 1〜5
 */
function umbrellaLevelFromWeatherCode(code) {
  if (code >= 95 || code === 82 || code === 65) return 5;
  if (code === 81 || code === 63 || code === 67) return 4;
  if (code === 80 || code === 61 || code === 66) return 3;
  if (code >= 51 && code <= 57) return 2;
  return 1;
}

/**
 * 判定結果オブジェクトを組み立てる
 * @param {number} level
 * @param {Record<number, string>} messages
 * @returns {{ level: number, stars: string, message: string }}
 */
function buildLevelResult(level, messages) {
  return {
    level,
    stars: toStarDisplay(level),
    message: messages[level],
  };
}

/**
 * 日傘レベルを判定する
 * @param {ReturnType<typeof extractRemainingTodaySamples>} samples
 * @returns {{ level: number, stars: string, message: string }}
 */
function calcParasolLevel(samples) {
  if (!samples.length) {
    return FALLBACK_RESULT;
  }

  const maxUv = Math.max(...samples.map((sample) => sample.uvIndex));
  return buildLevelResult(parasolLevelFromUv(maxUv), PARASOL_MESSAGES);
}

/**
 * 雨傘レベルを判定する
 * @param {ReturnType<typeof extractRemainingTodaySamples>} samples
 * @returns {{ level: number, stars: string, message: string }}
 */
function calcUmbrellaLevel(samples) {
  if (!samples.length) {
    return FALLBACK_RESULT;
  }

  const fromPrecip = Math.max(
    ...samples.map((sample) => umbrellaLevelFromPrecipitation(sample.precipitation)),
  );
  const fromCode = Math.max(
    ...samples.map((sample) => umbrellaLevelFromWeatherCode(sample.weatherCode)),
  );

  return buildLevelResult(Math.max(fromPrecip, fromCode), UMBRELLA_MESSAGES);
}

/**
 * 天気データから日傘・雨傘の診断結果を返す（main.js から呼び出す入口）
 * @param {Object} weatherData - fetchWeatherData() の戻り値
 * @returns {{ parasol: object, umbrella: object } | null}
 */
function diagnoseUmbrellaLevels(weatherData) {
  if (!weatherData || !weatherData.hourly) {
    return null;
  }

  const samples = extractRemainingTodaySamples(weatherData.hourly);

  return {
    parasol: calcParasolLevel(samples),
    umbrella: calcUmbrellaLevel(samples),
  };
}
