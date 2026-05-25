// Author: Junci Chen
let rainData = [];
let isLoading = true;
let lastUpdateTime = "";

// 使用更穩定的 allorigins 作為 CORS 代理伺服器
const API_URL = 'https://wic.gov.taipei/OpenData/API/Rain/Get?stationNo=&loginId=open_rain&dataKey=85452C1D';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Mappa 地圖相關變數
let myMap;
let canvas;
let mappa;
const options = {
  lat: 25.08,      // 台北市中心緯度
  lng: 121.55,     // 台北市中心經度
  zoom: 12,        
  style: "https://{s}.tile.osm.org/{z}/{x}/{y}.png"
}

// 建立測站座標字典 (手動對應主要測站的經緯度)
const stationCoords = {
  'C0A9G0': { lat: 25.138, lng: 121.474 }, // 貴子坑
  'C0A9H0': { lat: 25.176, lng: 121.543 }, // 百拉卡
  'C0A9L1': { lat: 24.968, lng: 121.588 }, // 貓空
  'C0A9M0': { lat: 25.029, lng: 121.536 }, // 大安
  'C0A9F0': { lat: 25.078, lng: 121.589 }, // 內湖
};

function setup() {
  // 採用全螢幕畫面
  canvas = createCanvas(windowWidth, windowHeight);
  
  // 初始化地圖並將畫布疊加上去
  mappa = new Mappa('Leaflet');
  myMap = mappa.tileMap(options);
  myMap.overlay(canvas);
  
  // 呼叫 API 取得資料
  fetchData();
  
  // 設定每 10 分鐘自動重新抓取一次資料
  setInterval(fetchData, 10 * 60 * 1000);
}

// 採用 fetch 進行非同步資料抓取
async function fetchData() {
  isLoading = true;
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(API_URL));
    const data = await res.json();
    
    // 解析資料並補上經緯度
    rainData = data.map(item => {
      // 若字典中沒有該站，透過字元碼生成一個台北市範圍內的展示用假座標
      let lat = 25.0 + (item.stationName.charCodeAt(0) % 20) * 0.01; 
      let lng = 121.5 + (item.stationName.charCodeAt(1) % 20) * 0.01;
      
      if (stationCoords[item.stationNo]) {
        lat = stationCoords[item.stationNo].lat;
        lng = stationCoords[item.stationNo].lng;
      }

      return {
        stationNo: item.stationNo,
        stationName: item.stationName,
        rain: parseFloat(item.rain) || 0, // 正確的即時雨量欄位
        recTime: item.recTime,
        lat: lat,
        lng: lng
      };
    });

    // 紀錄最後更新時間
    let d = new Date();
    lastUpdateTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  } catch (error) {
    console.error("資料載入失敗:", error);
  } finally {
    isLoading = false;
  }
}

function draw() {
  // 必須用 clear() 清除畫布，才能透視到底層的地圖
  clear(); 
  
  // 資料載入中的顯示畫面
  if (isLoading) {
    fill(50);
    noStroke();
    textSize(24);
    textAlign(CENTER, CENTER);
    text("資料載入中...", width / 2, height / 2);
    return;
  }
  
  // 繪製左上角標題與更新時間資訊板
  fill(255, 200);
  noStroke();
  rect(20, 20, 230, 70, 8);
  fill(0, 100, 200);
  textSize(24);
  textAlign(LEFT, TOP);
  text("台北市即時雨量", 30, 30);
  textSize(14);
  fill(50);
  text(`最後更新: ${lastUpdateTime}`, 30, 60);
  
  let hoverStation = null;
  
  // 逐筆將測站畫在地圖上
  for (let station of rainData) {
    // 呼叫 Mappa 的功能，將經緯度轉換成畫布的像素座標
    let pos = myMap.latLngToPixel(station.lat, station.lng);
    let r = 10; 
    
    // 依據雨量大小設定顏色
    if (station.rain >= 10) {
      fill(255, 23, 68, 200);  // 大雨/豪雨：紅色，放大圓點
      r = 15; 
    } else if (station.rain > 0) {
      fill(255, 184, 0, 200);  // 中小雨：黃色
      r = 12;
    } else {
      fill(42, 58, 90, 150);   // 無雨：深灰色
    }
    
    stroke(255);
    strokeWeight(1.5);
    circle(pos.x, pos.y, r * 2);
    
    // 判斷滑鼠是否停留在該測站圓點上
    let d = dist(mouseX, mouseY, pos.x, pos.y);
    if (d < r) {
      hoverStation = { data: station, x: pos.x, y: pos.y };
    }
  }
  
  // 滑鼠懸停時，顯示該站的詳細 Tooltip 資訊框
  if (hoverStation) {
    drawTooltip(hoverStation.data, hoverStation.x, hoverStation.y);
  }
}

// 繪製詳細資訊提示框
function drawTooltip(station, x, y) {
  let txt = `📍 ${station.stationName}測站\n` +
            `累積雨量: ${station.rain} mm\n` +
            `更新時間: ${station.recTime}`;
            
  textSize(14);
  textAlign(LEFT, TOP);
  
  let boxWidth = 160;
  let boxHeight = 70;
  let boxX = x + 15;
  let boxY = y + 15;
  
  // 邊界防呆：避免提示框超出視窗右側或下方
  if (boxX + boxWidth > width) boxX = x - boxWidth - 15;
  if (boxY + boxHeight > height) boxY = y - boxHeight - 15;
  
  fill(10, 16, 32, 230); // 深藍黑色背景
  noStroke();
  rect(boxX, boxY, boxWidth, boxHeight, 8);
  
  // 有降雨時文字用青色，無雨用灰色
  if (station.rain > 0) fill(0, 212, 255); 
  else fill(200); 
  
  text(txt, boxX + 12, boxY + 12);
}

// 視窗縮放時，自動重新調整畫布大小維持全螢幕
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}