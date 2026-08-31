/**
 * 画面制御
 * 地域ドロップダウンの操作を検知し、天気取得 → 傘レベル判定 → HTML反映を行う。
 */

const LOADING_RESULT = {
  stars: "☆ ☆ ☆ ☆ ☆",
  message: "データ取得中...",
};

const ERROR_RESULT = {
  stars: "☆ ☆ ☆ ☆ ☆",
  message: "天気データを取得できませんでした。もう一度地域を選び直してください。",
};

/** 連続操作で古い応答が後から上書きしないようにする */
let latestRequestId = 0;

/**
 * WMO天気コードを表示用の文言とアイコンに変換する
 * @param {number} code
 * @returns {{ label: string, icon: string }}
 */
function describeWeather(code) {
  if (code === 0) return { label: "快晴", icon: "fa-sun" };
  if (code === 1) return { label: "晴れ", icon: "fa-sun" };
  if (code === 2) return { label: "一部曇り", icon: "fa-cloud-sun" };
  if (code === 3) return { label: "曇り", icon: "fa-cloud" };
  if (code === 45 || code === 48) return { label: "霧", icon: "fa-smog" };
  if (code >= 51 && code <= 57) return { label: "霧雨", icon: "fa-cloud-rain" };
  if (code >= 61 && code <= 67) return { label: "雨", icon: "fa-cloud-showers-heavy" };
  if (code >= 71 && code <= 77) return { label: "雪", icon: "fa-snowflake" };
  if (code >= 80 && code <= 82) return { label: "にわか雨", icon: "fa-cloud-sun-rain" };
  if (code >= 85 && code <= 86) return { label: "雪", icon: "fa-snowflake" };
  if (code >= 95) return { label: "雷雨", icon: "fa-bolt" };
  return { label: "不明", icon: "fa-cloud" };
}

/**
 * 日傘 / 雨傘カードの ★ とメッセージを更新する
 * @param {"parasol" | "umbrella"} type
 * @param {{ stars: string, message: string }} result
 */
function renderLevelCard(type, result) {
  document.getElementById(`${type}-level`).textContent = result.stars;
  document.getElementById(`${type}-message`).textContent = result.message;
}

/**
 * 時系列リストを描画する
 * @param {ReturnType<typeof extractRemainingTodaySamples>} samples
 * @param {string} [cityName]
 * @param {string} [emptyMessage]
 */
function renderForecastList(samples, cityName, emptyMessage) {
  const heading = document.querySelector(".hourly-forecast h3");
  heading.textContent = cityName ? `本日の時系列予報（${cityName}）` : "本日の時系列予報";

  const list = document.getElementById("forecast-list");
  list.replaceChildren();

  if (!samples.length) {
    const empty = document.createElement("p");
    empty.className = "forecast-empty";
    empty.textContent = emptyMessage || "本日の残りの予報はありません。";
    list.appendChild(empty);
    return;
  }

  samples.forEach((sample) => {
    const weather = describeWeather(sample.weatherCode);
    const item = document.createElement("div");
    item.className = "forecast-item";

    const timeEl = document.createElement("span");
    timeEl.className = "forecast-time";
    timeEl.textContent = sample.time.slice(11, 16);

    const weatherEl = document.createElement("span");
    weatherEl.className = "forecast-weather";
    const iconEl = document.createElement("i");
    iconEl.className = `fa-solid ${weather.icon}`;
    iconEl.setAttribute("aria-hidden", "true");
    weatherEl.appendChild(iconEl);
    weatherEl.appendChild(document.createTextNode(` ${weather.label}`));

    const precipEl = document.createElement("span");
    precipEl.className = "forecast-precip";
    precipEl.textContent = `降水 ${sample.precipitation.toFixed(1)}mm`;

    const uvEl = document.createElement("span");
    uvEl.className = "forecast-uv";
    uvEl.textContent = `UV ${sample.uvIndex.toFixed(1)}`;

    item.append(timeEl, weatherEl, precipEl, uvEl);
    list.appendChild(item);
  });
}

function renderLoading() {
  renderLevelCard("parasol", LOADING_RESULT);
  renderLevelCard("umbrella", LOADING_RESULT);
  renderForecastList([], undefined, "読み込み中...");
}

function renderError() {
  renderLevelCard("parasol", ERROR_RESULT);
  renderLevelCard("umbrella", ERROR_RESULT);
  const list = document.getElementById("forecast-list");
  list.replaceChildren();
  const error = document.createElement("p");
  error.className = "forecast-empty";
  error.textContent = "予報を表示できませんでした。";
  list.appendChild(error);
}

/**
 * 選択中の地域で天気を取得し、診断結果と時系列を画面へ反映する
 * @param {string} cityKey
 */
async function updateDashboard(cityKey) {
  const requestId = ++latestRequestId;
  renderLoading();

  const weatherData = await fetchWeatherData(cityKey);
  if (requestId !== latestRequestId) {
    return;
  }

  const diagnosis = diagnoseUmbrellaLevels(weatherData);
  if (!diagnosis) {
    renderError();
    return;
  }

  renderLevelCard("parasol", diagnosis.parasol);
  renderLevelCard("umbrella", diagnosis.umbrella);
  renderForecastList(extractRemainingTodaySamples(weatherData.hourly), weatherData.cityName);
}

/**
 * CITY_COORDINATES から地域ドロップダウンを組み立てる
 * @param {HTMLSelectElement} select
 */
function populateCitySelect(select) {
  select.replaceChildren();

  Object.entries(CITY_COORDINATES).forEach(([key, city]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = city.name;
    select.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const citySelect = document.getElementById("city-select");
  populateCitySelect(citySelect);

  citySelect.addEventListener("change", () => {
    updateDashboard(citySelect.value);
  });

  updateDashboard(citySelect.value);
});
