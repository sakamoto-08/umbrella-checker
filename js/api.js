// 東京23区の区役所付近の緯度・経度
const CITY_COORDINATES = {
  chiyoda: { lat: 35.694, lon: 139.753, name: "千代田区" },
  chuo: { lat: 35.671, lon: 139.772, name: "中央区" },
  minato: { lat: 35.658, lon: 139.752, name: "港区" },
  shinjuku: { lat: 35.694, lon: 139.703, name: "新宿区" },
  bunkyo: { lat: 35.708, lon: 139.752, name: "文京区" },
  taito: { lat: 35.712, lon: 139.780, name: "台東区" },
  sumida: { lat: 35.711, lon: 139.801, name: "墨田区" },
  koto: { lat: 35.673, lon: 139.817, name: "江東区" },
  shinagawa: { lat: 35.609, lon: 139.730, name: "品川区" },
  meguro: { lat: 35.641, lon: 139.698, name: "目黒区" },
  ota: { lat: 35.561, lon: 139.716, name: "大田区" },
  setagaya: { lat: 35.646, lon: 139.653, name: "世田谷区" },
  shibuya: { lat: 35.664, lon: 139.698, name: "渋谷区" },
  nakano: { lat: 35.707, lon: 139.664, name: "中野区" },
  suginami: { lat: 35.700, lon: 139.636, name: "杉並区" },
  toshima: { lat: 35.729, lon: 139.715, name: "豊島区" },
  kita: { lat: 35.753, lon: 139.734, name: "北区" },
  arakawa: { lat: 35.736, lon: 139.783, name: "荒川区" },
  itabashi: { lat: 35.751, lon: 139.709, name: "板橋区" },
  nerima: { lat: 35.736, lon: 139.652, name: "練馬区" },
  adachi: { lat: 35.775, lon: 139.804, name: "足立区" },
  katsushika: { lat: 35.743, lon: 139.847, name: "葛飾区" },
  edogawa: { lat: 35.707, lon: 139.868, name: "江戸川区" },
};

/**
 * 指定された地域の天気データを取得する関数
 * @param {string} cityKey - 地域キー（CITY_COORDINATES のキー）
 * @returns {Promise<Object|null>} 時系列天気データ
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
