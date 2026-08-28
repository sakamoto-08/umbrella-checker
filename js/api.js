// 各地域の緯度・経度データ（東京23区主要エリア例）
const CITY_COORDINATES = {
  chiyoda: { lat: 35.694, lon: 139.754, name: "千代田区" },
  shinjuku: { lat: 35.693, lon: 139.703, name: "新宿区" },
  shibuya: { lat: 35.658, lon: 139.701, name: "渋谷区" },
};

/**
 * 指定された地域の天気データを取得する関数
 * @param {string} cityKey - 地域キー (chiyoda, shinjuku, shibuya)
 * @returns {Promise<Object>} 時系列天気データ
 */
async function fetchWeatherData(cityKey = "chiyoda") {
  const coords = CITY_COORDINATES[cityKey] || CITY_COORDINATES.chiyoda;

  // Open-Meteo API URL (時間ごとの降水量・UVインデックスを取得)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=precipitation,uv_index,weather_code&timezone=Asia%2FTokyo`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      cityName: coords.name,
      hourly: data.hourly,
    };
  } catch (error) {
    console.error("天気データの取得に失敗しました:", error);
    return null;
  }
}
