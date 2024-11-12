import { getText } from '@zos/i18n'
import { BasePage } from '@zeppos/zml/base-page'
import { createWidget, deleteWidget, widget, prop, align, text_style, event, anim_status } from '@zos/ui'
import { setStatusBarVisible, redraw  } from '@zos/ui'
import { showToast } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log, px } from '@zos/utils'
import { push } from '@zos/router'
import { connectStatus } from '@zos/ble'
import { setScrollLock } from '@zos/page'
import { setPageBrightTime, resetPageBrightTime } from '@zos/display'
import { Weather, Time, Battery, TIME_HOUR_FORMAT_12 } from '@zos/sensor'
import { getDateFormat, DATE_FORMAT_YMD, DATE_FORMAT_DMY, DATE_FORMAT_MDY } from '@zos/settings'
import { BTN_SETTINGS, BTN_INFO, BTN_CHART } from 'zosLoader:./index.[pf].layout.js'
import { TXT_CITY, TXT_DISTRICT, TXT_TEMPERATURE, TXT_WEATHER_DESCRIPTION,TXT_WEATHER_TIME, NOTIF_OFFSET_Y } from 'zosLoader:./index.[pf].layout.js'

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT  } = getDeviceInfo();
const logger = log.getLogger("Weather_Forecast.index");
setStatusBarVisible(false);

let globalData = getApp()._options.globalData;
let weatherJson = globalData.weatherJson;
let storage = globalData.storage;

let bg;
let sun_moon;
let notif_feelslike;
let notif_pressure;
let notif_humidity
let notif_wind;
let notif_cloudiness;

let textCity;
let textDistrict;
let textTemperature;
let textWeatherDescription;
let textTime;
let textSunrise;
let textSunset;
let textMoonrise;
let textMoonset;

let imgSunrise;
let imgSunset;
let imgMoonrise;
let imgMoonset;

let imgClouds_1;
let imgClouds_2;

let thunderstorm;


//#region functions

function GetTextID() {
  let textID = {
    element_text_id_UVI: getText('element_text_id_UVI'),
    element_text_id_windSpeed: getText('element_text_id_windSpeed'),
    element_text_id_windGusts: getText('element_text_id_windGusts'),
    element_text_id_humidity: getText('element_text_id_humidity'),
    element_text_id_pressure: getText('element_text_id_pressure'),
    element_text_id_cloudiness: getText('element_text_id_cloudiness'),
    element_text_id_visibility: getText('element_text_id_visibility'),
    element_text_id_chanceOfRain: getText('element_text_id_chanceOfRain'),
    element_text_id_rainfall: getText('element_text_id_rainfall'),

  };
  return textID;
}

function updateWidget() {
  logger.log(`updateWidget()`);  
  // logger.log(`weatherJson.district = ${JSON.stringify(weatherJson.district)}`);
  // let lat = globalData.latitude;
  // let lon = globalData.longitude;

  let pod = DayOrNight();
  let src = pod == 'day' ? 'weather_img/bg_day.png': 'weather_img/bg_night.png';
  let sun_moon_src = pod == 'day' ? 'weather_img/sun.png': 'weather_img/moon.png';
  
  bg.setProperty(prop.SRC, src);
  sun_moon.setProperty(prop.SRC, sun_moon_src);
  SunMoonPosition(pod);

  // let weatherJson = globalData.weatherJson;
  let cityStr = "--";
  let districtStr = "";
  let temperatureStr = "--";
  let feelslikeStr = "--";
  let weatherDescriptionStr = "--";
  let humidityStr = "--";
  let windStr = "--";
  let windAngle = 0; // degree
  let pressureStr = "--";
  let cloudinessStr = "--";
  let timeStr = "--:--";
  let sunriseStr = "--:--";
  let sunsetStr = "--:--";
  
  let moonriseImg = 'transparent_img.png';
  let moonsetImg = 'transparent_img.png';
  let moonriseStr = '';
  let moonsetStr = '';
  
  if (weatherJson != undefined && weatherJson != null) {
    // logger.log(`city = ${weatherJson.city}`);
    if (weatherJson.city != undefined && weatherJson.city != null && weatherJson.city.length > 0) {
      cityStr = weatherJson.city;
      cityStr = cityStr.replace(cityStr[0], cityStr[0].toUpperCase());
    }
    if (weatherJson.district != undefined && weatherJson.district != null && weatherJson.district.length > 0) {
      districtStr = weatherJson.district;
      districtStr = districtStr.replace(districtStr[0], districtStr[0].toUpperCase());
    }
    // logger.log(`temperature = ${weatherJson.temperature}`);
    if (isFinite(weatherJson.temperature)) {
      let temperature_unit = storage.getKey("temperature_unit", 0);
      let temperature = parseFloat(weatherJson.temperature).toFixed(0);
      if (temperature_unit == 1) {
        temperature = CelsiusToFahrenheit(temperature);
        temperatureStr = temperature + '°F';
      }
      else temperatureStr = temperature + '°C';
    }
    if (isFinite(weatherJson.temperatureFeels)) {
      let temperature_unit = storage.getKey("temperature_unit", 0);
      let temperature = parseFloat(weatherJson.temperatureFeels).toFixed(0);
      if (temperature_unit == 1) {
        temperature = CelsiusToFahrenheit(temperature);
        feelslikeStr = temperature + '°F';
      }
      else feelslikeStr = temperature + '°C';
    }
    if (weatherJson.weatherDescriptionExtended != undefined && weatherJson.weatherDescriptionExtended != null && weatherJson.weatherDescriptionExtended.length > 0) {
      weatherDescriptionStr = weatherJson.weatherDescriptionExtended;
      weatherDescriptionStr = weatherDescriptionStr.replace(weatherDescriptionStr[0], weatherDescriptionStr[0].toUpperCase());
    }
    // logger.log(`humidity = ${weatherJson.humidity}`);
    if (isFinite(weatherJson.humidity)) {
      humidityStr = weatherJson.humidity + '%';
    }
    // logger.log(`windSpeed = ${weatherJson.windSpeed}`);
    // logger.log(`windGusts = ${weatherJson.windGusts}`);
    if (isFinite(weatherJson.windSpeed)) {
      let wind_unit = storage.getKey("wind_unit", 0);
      let wind = weatherJson.windSpeed;
      if (wind <= 2) rainAngle = 0;
      else if (wind <= 6) rainAngle = -15;
      else if (wind <= 10) rainAngle = -30;
      else rainAngle = -45;
      if (wind_unit == 1) {
        wind = parseFloat(wind * 3.6).toFixed(0);
        windStr = wind + getText('kph');
        // windStr = wind + ' kph';
      }
      else if (wind_unit == 2) {
        wind = parseFloat(wind * 2.23694).toFixed(0);
        windStr = wind + getText('mph');
        // windStr = wind + ' mph';
      }
      else {
        wind = parseFloat(wind).toFixed(0);
        windStr = wind + getText('m_s');
        // windStr = wind + ' m/s';
      }
    }
    if (isFinite(weatherJson.windDirection)) {
      windAngle = weatherJson.windDirection;
    }
    // logger.log(`pressure = ${weatherJson.pressure}`);
    if (isFinite(weatherJson.pressure)) {
      let pressure_unit = storage.getKey("pressure_unit", 0);
      let pressure = weatherJson.pressure;
      if (pressure_unit == 1) {
        pressure = HpaToMmHg(pressure);
        // pressureStr = pressure + getText('mmHg');
        pressureStr = pressure + ' mmHg';
      }
      else pressureStr = pressure + ' hPa';
    }
    // logger.log(`cloudiness = ${weatherJson.cloudiness}`);
    if (isFinite(weatherJson.cloudiness)) {
      cloudinessStr = weatherJson.cloudiness + '%';
    }
    // logger.log(`weatherTime = ${weatherJson.weatherTime}`);
    if (isFinite(weatherJson.weatherTime)) {
      const weatherTime = new Date(weatherJson.weatherTime);
      // const dateNaw = new Date();
      console.log(`weatherTime = ${weatherTime.toString()}`);
      // console.log(`dateNaw = ${dateNaw.toString()}`);
      const currentDateFormat = getDateFormat();
      if (currentDateFormat === DATE_FORMAT_DMY) {
        timeStr = weatherTime.getDate() + ' ' + getText('month_' + weatherTime.getMonth()) + ' ' + weatherTime.getFullYear();
      }
      else if (currentDateFormat === DATE_FORMAT_YMD || currentDateFormat === DATE_FORMAT_MDY) {
        timeStr = getText('month_' + weatherTime.getMonth()) + ', ' + weatherTime.getDate() + ', ' + weatherTime.getFullYear();
      }
      // timeStr = weatherTime.getDate() + ' ' + getText('month_' + weatherTime.getMonth()) + ' ' + weatherTime.getFullYear();
      let hour = weatherTime.getHours();
      let minute = weatherTime.getMinutes();
      const time = new Time();
      if (time.getHourFormat() == TIME_HOUR_FORMAT_12) {
        let am_pm = 'AM';
        if (hour >= 12) {
          hour -= 12;
          am_pm = 'PM';
        }
        if (hour == 0) {
          hour = 12;
        }
        timeStr +=  ' ' + hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0') + ' ' + am_pm;
      }
      else timeStr +=  ' ' + hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0');
    }

    if (isFinite(weatherJson.sunriseTime)) {
      const sunrise = new Date(weatherJson.sunriseTime);
      sunriseStr = sunrise.getHours().toString().padStart(2, '0') + ':' + sunrise.getMinutes().toString().padStart(2, '0');
    }
    if (isFinite(weatherJson.sunsetTime)) {
      const sunset = new Date(weatherJson.sunsetTime);
      sunsetStr = sunset.getHours().toString().padStart(2, '0') + ':' + sunset.getMinutes().toString().padStart(2, '0');
    }
    if (isFinite(weatherJson.moonriseTime)) {
      const moonrise = new Date(weatherJson.moonriseTime);
      moonriseStr = moonrise.getHours().toString().padStart(2, '0') + ':' + moonrise.getMinutes().toString().padStart(2, '0');
      moonriseImg = 'weather_img/moonrise.png';
    }
    if (isFinite(weatherJson.moonsetTime)) {
      const moonset = new Date(weatherJson.moonsetTime);
      moonsetStr = moonset.getHours().toString().padStart(2, '0') + ':' + moonset.getMinutes().toString().padStart(2, '0');
      moonsetImg = 'weather_img/moonset.png';
    }
  }

  textCity.text = cityStr;
  textDistrict.text = districtStr;
  textTemperature.text = temperatureStr;
  textWeatherDescription.text = weatherDescriptionStr;
  textTime.text = timeStr;
  textSunrise.text = sunriseStr;
  textSunset.text = sunsetStr;
  textMoonrise.text = moonriseStr;
  textMoonset.text = moonsetStr;
  imgMoonrise.setProperty(prop.SRC, moonriseImg);
  imgMoonset.setProperty(prop.SRC, moonsetImg);

  notif_feelslike.updateValue(feelslikeStr);
  notif_humidity.updateValue(humidityStr);
  notif_wind.updateValue(windStr, windAngle);
  notif_pressure.updateValue(pressureStr);
  notif_cloudiness.updateValue(cloudinessStr);

  let cloud_1_params = ['transparent_img.png', px(-400), px(-20), 0, px(-20), 25, 1];
  let cloud_2_params = ['transparent_img.png', px(-600), px(50), px(-200), px(50), 15, 1];
  let cloudiness_index = GetCloudiness();
  switch (cloudiness_index) {
    case 1:
      cloud_1_params = ['weather_img/cloud_01.png', px(-400), px(-20), 0, px(-20), 25, 25];
      cloud_2_params = ['weather_img/cloud_01.png', px(-600), px(50), px(-200), px(50), 15, 25];
      break;

    case 2:
      cloud_1_params = ['weather_img/cloud_02.png', px(-400), px(-30), 0, px(-30), 25, 25];
      cloud_2_params = ['weather_img/cloud_02.png', px(-600), px(135), px(-200), px(135), 10, 25];
      break;

    case 3:
      cloud_1_params = ['weather_img/cloud_03.png', px(-400), 0, 0, 0, 25, 25];
      cloud_2_params = ['weather_img/cloud_04.png', px(-600), px(65), px(-200), px(65), 10, 25];
      break;
  
  }
  imgClouds_1.updateWidget(...cloud_1_params);
  imgClouds_2.updateWidget(...cloud_2_params);
  if (cloudiness_index > 0) { 
    imgClouds_1.startMove();
    imgClouds_2.startMove();
  }

  
  let cloudinessSrc = 'weather_img/notif_cloudiness_0.png';
  if (cloudiness_index > 0) cloudinessSrc = 'weather_img/notif_cloudiness_' + cloudiness_index + '.png';
  notif_cloudiness.updateIcon(cloudinessSrc);

  //#region Snow
  let snow_index = GetSnow();
  logger.log(`snow_index = ${snow_index}`);
  // snowfall.stop();
  // snowfall.del();
  if (snow_index == 0) {
    if (snowfall) snowfall.reLoad(0);
  }
  else if (snow_index == 1) {
		snowMaxSpeed = 3;
		snowMinSpeed = 1;
    snowMaxSize = 30;
    if (snowfall) {
      snowfall.reLoad(10); 
      snowfall.start();
    }
    else snowfall = new Snowfall(10);
    // snowfall.reLoad(10);
    snowfall.start();
  }
  else if (snow_index == 2) {
		snowMaxSpeed = 3;
		snowMinSpeed = 1;
    snowMaxSize = 40;
    if (snowfall) {
      snowfall.reLoad(20); 
      snowfall.start();
    }
    else snowfall = new Snowfall(20);
    // snowfall.reLoad(20);
    snowfall.start();
  }
  else if (snow_index == 3) {
		snowMaxSpeed = 4;
		snowMinSpeed = 2;
    snowMaxSize = 50;
    if (snowfall) {
      snowfall.reLoad(30); 
      snowfall.start();
    }
    else snowfall = new Snowfall(30);
    // snowfall.reLoad(30);
    snowfall.start();
  }
  //#endregion

  //#region Rain
  let rain_index = GetRain();
  logger.log(`rain_index = ${rain_index}`);
  // rain.stop();
  // rain.del();
  if (rain_index == 0) {
    if (rain) rain.reLoad(0);
  }
  else if (rain_index == 1) {
		snowMaxSpeed = 3;
		snowMinSpeed = 1;
    snowMinSize = 5;
    snowMaxSize = 10;
    if (rain) {
      rain.reLoad(10); 
      rain.start();
    }
    else rain = new Rain(10);
    // rain.reLoad(10);
    rain.start();
  }
  else if (rain_index == 2) {
		rainMaxSpeed = 5;
		rainMinSpeed = 3;
    snowMinSize = 10;
    rainMaxSize = 20;
    if (rain) {
      rain.reLoad(20); 
      rain.start();
    }
    else rain = new Rain(20);
    // rain.reLoad(20);
    rain.start();
  }
  else if (rain_index == 3) {
		rainMaxSpeed = 7;
		rainMinSpeed = 5;
    snowMinSize = 10;
    rainMaxSize = 30;
    if (rain) {
      rain.reLoad(30); 
      rain.start();
    }
    else rain = new Rain(30);
    // rain.reLoad(30);
    rain.start();
  }
  //#endregion

  if (weatherJson != undefined && weatherJson != null) {
    if (weatherJson.weatherIcon == 8) thunderstorm.setProperty(prop.ANIM_STATUS, anim_status.START);
  }
}

function DayOrNight () {
  logger.log(`DayOrNight`);
  let now = new Date();
  sunrise = now;
  sunset = now;
  if (weatherJson != undefined && weatherJson.sunriseTime != undefined && weatherJson.sunsetTime != undefined) {
    sunrise = new Date(weatherJson.sunriseTime);
    // logger.log(`sunrise = ${sunrise.toString()}`);
    // logger.log(`sunrise.getTime() = ${sunrise.getTime()}`);
  
    sunset = new Date(weatherJson.sunsetTime);
    // logger.log(`sunset = ${sunset.toString()}`);
    // logger.log(`sunset.getTime() = ${sunset.getTime()}`);

    if (now.getDate() != sunrise.getDate()) {
      logger.log(`now.getDate(${now.getDate()}) != sunrise.getDate(${sunrise.getDate()})`);
      const weather = new Weather();
      const { tideData } = weather.getForecast();
  
      if (tideData != undefined && tideData != null && tideData.count > 0) {
        // logger.log(`tideData_ = ${JSON.stringify(tideData)}`);
        sunrise = new Date(tideData.data[0].sunrise.hour*60 + tideData.data[0].sunrise.minute);
        sunset = new Date(tideData.data[0].sunset.hour*60 + tideData.data[0].sunset.minute);
        const time = new Time()
        now = time.getHours()*60 + time.getMinutes();
      }
    }
  }
  else {
    logger.log(`No sunrise/sunset time`);
    const weather = new Weather();
    const { tideData } = weather.getForecast();

    if (tideData != undefined && tideData != null && tideData.count > 0) {
      // logger.log(`tideData_ = ${JSON.stringify(tideData)}`);
      sunrise = new Date(tideData.data[0].sunrise.hour*60 + tideData.data[0].sunrise.minute);
      sunset = new Date(tideData.data[0].sunset.hour*60 + tideData.data[0].sunset.minute);
      const time = new Time()
      now = time.getHours()*60 + time.getMinutes();
    }
  }
  
  if (now >= sunrise && now <= sunset) {
    return 'day';
  } else {
    return 'night';
  }

  
}

function SunMoonPosition (pod) {
  logger.log(`SunMoonPosition (pod = ${pod})`);
  // if (weatherJson == undefined || weatherJson == null) return undefined;
  
  let now = new Date();
  let sunrise = new Date(weatherJson.sunriseTime);
  let sunset = new Date(weatherJson.sunsetTime);
  logger.log(`sunrise = ${sunrise}`);
  logger.log(`sunset = ${sunset}`);
  logger.log(`now = ${now}`);

  if (pod == 'day') {
    // sunrise = new Date(weatherJson.sunriseTime);
    // sunset = new Date(weatherJson.sunsetTime);
    // now = new Date();
    if (weatherJson != undefined && weatherJson.sunriseTime != undefined && weatherJson.sunsetTime != undefined && 
      now.getDate() == new Date(weatherJson.sunriseTime).getDate()) {

        logger.log(`now.getDate(${now.getDate()}) == sunrise.getDate(${sunrise.getDate()})`);
      // sunrise = new Date(weatherJson.sunriseTime);
      // sunset = new Date(weatherJson.sunsetTime);
      
      sunrise = sunrise.getHours()*60 + sunrise.getMinutes();
      sunset = sunset.getHours()*60 + sunset.getMinutes();
      now = now.getHours()*60 + now.getMinutes();

    } 
    else{
      if (weatherJson != undefined || weatherJson.sunriseTime != undefined || weatherJson.sunsetTime != undefined) logger.log(`No moon data`);
      logger.log(`now.getDate(${now.getDate()}) != sunrise.getDate(${sunrise.getDate()})`);
      // logger.log(`now.getDate() != sunrise.getDate()`);
      const weather = new Weather();
      const { tideData } = weather.getForecast();

      if (tideData != undefined && tideData != null && tideData.count > 0) {
        // logger.log(`tideData_ = ${JSON.stringify(tideData)}`);
        sunrise = new Date(tideData.data[0].sunrise.hour*60 + tideData.data[0].sunrise.minute);
        sunset = new Date(tideData.data[0].sunset.hour*60 + tideData.data[0].sunset.minute);
        const time = new Time()
        now = time.getHours()*60 + time.getMinutes();
      }
    }

    let dayLenght = sunset - sunrise;
    let dayPosition = (now - sunrise) / dayLenght;
    logger.log(`dayPosition = ${dayPosition}`);
    let posX = (DEVICE_WIDTH - px(200)) * dayPosition;
    sun_moon.setProperty(prop.X, posX);
  }
  else { // ночь
    if (weatherJson != undefined && weatherJson.sunriseTime != undefined && weatherJson.sunsetTime != undefined && 
      now.getDate() == new Date(weatherJson.sunriseTime).getDate()) {

      logger.log(`now.getDate(${now.getDate()}) == sunrise.getDate(${sunrise.getDate()})`);
      sunset = new Date(weatherJson.sunriseTime);
      sunrise = new Date(weatherJson.sunsetTime);

      sunrise = sunrise.getHours()*60 + sunrise.getMinutes();
      sunset = sunset.getHours()*60 + sunset.getMinutes();
      now = now.getHours()*60 + now.getMinutes();
    }
    else {
      if (weatherJson != undefined || weatherJson.sunriseTime != undefined || weatherJson.sunsetTime != undefined) logger.log(`No moon data`);
      logger.log(`now.getDate(${now.getDate()}) != sunrise.getDate(${sunrise.getDate()})`);
      const weather = new Weather();
      const { tideData } = weather.getForecast();
  
      if (tideData != undefined && tideData != null && tideData.count > 0) {
        sunset = tideData.data[0].sunrise.hour*60 + tideData.data[0].sunrise.minute;
        sunrise = tideData.data[0].sunset.hour*60 + tideData.data[0].sunset.minute;
        const time = new Time()
        now = time.getHours()*60 + time.getMinutes();
      }
    }

    if (sunset < sunrise) sunset += 24*60;
    if (now < sunrise) now += 24*60;

    let dayLenght = sunset - sunrise;
    let dayPosition = (now - sunrise) / dayLenght;
    logger.log(`dayPosition = ${dayPosition}`);
    if (dayPosition > 1) dayPosition = 1;
    if (dayPosition < 0) dayPosition = 0;
    let posX = (DEVICE_WIDTH - px(200)) * dayPosition;
    sun_moon.setProperty(prop.X, posX);

  }
}

function GetCloudiness() {
  logger.log(`GetCloudiness`);
  if (isSimulator()) return 0;
  let cloudiness_index = 0;
  if (weatherJson != undefined && weatherJson != null) {
    if (isFinite(weatherJson.cloudiness)) {
      let cloudiness = weatherJson.cloudiness;
      if (cloudiness > 11 && cloudiness <= 40) cloudiness_index = 1;
      if (cloudiness > 40 && cloudiness <= 70) cloudiness_index = 2;
      if (cloudiness > 70) cloudiness_index = 3;
      logger.log(`cloudiness = ${cloudiness}, cloudiness_index = ${cloudiness_index}`);
    }
  }
  return cloudiness_index;
}

function GetSnow() {
  logger.log(`GetSnow`);
  if (isSimulator()) return 0;
  let snow_index = 0;
  if (weatherJson != undefined && weatherJson != null) {
    if (isFinite(weatherJson.weatherIcon)) {
      let weatherIcon = weatherJson.weatherIcon;
      if (weatherIcon == 9 || weatherIcon == 12) snow_index = 1;
      if (weatherIcon == 10) cloudiness_index = 2;
      if (weatherIcon == 11) cloudiness_index = 3;
      logger.log(`weatherIcon = ${weatherIcon}, snow_index = ${snow_index}`);
    }
  }
  return snow_index;
  // return 3;
}

function GetRain() {
  logger.log(`GetRain`);
  if (isSimulator()) return 0;
  let rain_index = 0;
  if (weatherJson != undefined && weatherJson != null) {
    if (isFinite(weatherJson.weatherIcon)) {
      let weatherIcon = weatherJson.weatherIcon;
      if (weatherIcon == 5 || weatherIcon == 12) rain_index = 1;
      if (weatherIcon == 6) cloudiness_index = 2;
      if (weatherIcon == 7) cloudiness_index = 3;
      logger.log(`weatherIcon = ${weatherIcon}, rain_index = ${rain_index}`);
    }
  }
  return rain_index;
  // return 3;
}

function TemperatureUnit () {
  logger.log(`TemperatureUnit`);
  let temperature_unit = storage.getKey("temperature_unit", 0);
  temperature_unit = temperature_unit == 0 ? 1 : 0;
  storage.setKey("temperature_unit", temperature_unit);

  let temperatureStr = "--";
  let feelslikeStr = "--";
  if (isFinite(weatherJson.temperature)) {
    let temperature = weatherJson.temperature;
    if (temperature_unit == 1) {
      temperature = CelsiusToFahrenheit(temperature);
      temperatureStr = temperature + '°F';
    }
    else temperatureStr = parseFloat(temperature).toFixed(0) + '°C';
  }
  if (isFinite(weatherJson.temperatureFeels)) {
    let temperature = weatherJson.temperatureFeels;
    if (temperature_unit == 1) {
      temperature = CelsiusToFahrenheit(temperature);
      feelslikeStr = temperature + '°F';
    }
    else feelslikeStr = parseFloat(temperature).toFixed(0) + '°C';
  }
  textTemperature.text = temperatureStr;
  notif_feelslike.updateValue(feelslikeStr);
}

function PressureUnit () {
  logger.log(`PressureUnit`);
  let pressure_unit = storage.getKey("pressure_unit", 0);
  pressure_unit = pressure_unit == 0 ? 1 : 0;
  storage.setKey("pressure_unit", pressure_unit);

  let pressureStr = "--";
  if (isFinite(weatherJson.pressure)) {
    let pressure = weatherJson.pressure;
    if (pressure_unit == 1) {
      pressure = HpaToMmHg(pressure);
      // pressureStr = pressure + getText('mmHg');
      pressureStr = pressure + ' mmHg';
    }
    else pressureStr = pressure + ' hPa';
  }
  notif_pressure.updateValue(pressureStr);
}

function WindUnit () {
  logger.log(`WindUnit`);
  let wind_unit = storage.getKey("wind_unit", 0);
  wind_unit = ++wind_unit % 3;
  storage.setKey("wind_unit", wind_unit);

  let windStr = "--";
  let windAngle = 0;
  if (isFinite(weatherJson.windDirection)) {
    windAngle = weatherJson.windDirection;
  }
  if (isFinite(weatherJson.windSpeed)) {
    let wind = weatherJson.windSpeed;
    if (wind_unit == 1) {
      wind = parseFloat(wind * 3.6).toFixed(0);
      windStr = wind + getText('kph');
      // windStr = wind + ' kph';
    }
    else if (wind_unit == 2) {
      wind = parseFloat(wind * 2.23694).toFixed(0);
      windStr = wind + getText('mph');
      // windStr = wind + ' mph';
    }
    else {
      wind = parseFloat(wind).toFixed(0);
      windStr = wind + getText('m_s');
      // windStr = wind + ' m/s';
    }
  }
  notif_wind.updateValue(windStr, windAngle);
}
function CelsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9 / 5) + 32);
}

function HpaToMmHg(hpa) {
  return Math.round(hpa * 0.75006168271);
}

function lastUpdateDiffTime () {
  logger.log(`lastUpdateDiffTime`);
  const weatherTime = weatherJson.weatherTime;
  if (weatherTime != undefined && weatherTime != null) {
    const nowTime = new Date().getTime();
    const lastUpdateDiff = parseInt((nowTime - weatherTime) / ( 60 * 1000));
    logger.log(`lastUpdateDiff = ${lastUpdateDiff}`);
    return lastUpdateDiff;
  }
  return 99999;
}

function isSimulator () {
  const battery = new Battery();
  if (battery.getCurrent() == 0) return true;
  return false;
}
//#endregion

//#region class
class Notif {
  constructor(x, y, text, value, src, func, layout) {
    this.posX = -1;
    this.posY = -1;
    let group;
    if (layout == undefined || layout == null) {
      group = createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(120),
        h: px(95),
      });
    }
    else {
      group = layout.createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(120),
        h: px(95),
      });
    }

    this.fiil_rect = group.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(120),
      h: px(95),
      radius: px(20),
      color: 0x252525
    });

    this.img = group.createWidget(widget.IMG, {
      x: px(36),
      y: 0,
      src: src,
    });
    this.img.setEnable(false);

    this.value = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(42),
      w: px(120),
      h: px(30),
      text_size: px(22),
      color: 0xffffff,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: value,
    });
    this.value.setEnable(false);

    this.text = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(70),
      w: px(120),
      h: px(20),
      text_size: px(16),
      color: 0xffffff,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: text,
    });
    this.text.setEnable(false);

    let context = this;
    this.fiil_rect.addEventListener(event.CLICK_DOWN, function (info) {
      logger.log(`fiil_rect CLICK_DOWN`);
      context.posX = info.x;
      context.posY = info.y;
    });
    this.fiil_rect.addEventListener(event.CLICK_UP, function (info) {
      logger.log(`fiil_rect CLICK_UP`);
      let dX = Math.abs(info.x - context.posX);
      let dY = Math.abs(info.y - context.posY);
      context.posX = -1;
      context.posY = -1;
      logger.log(`dX = ${dX}, dY = ${dY}`);
      if (dX < 5 && dY < 5) func();
    })
    
  }

  updateValue(value) {
    this.value.setProperty(prop.TEXT, value);
  }

  updateIcon(src) {
    this.img.setProperty(prop.SRC, src);
  }
}

class NotifWind {
  constructor(x, y, text, value, src, pointer, func, layout) {
    this.posX = -1;
    this.posY = -1;
    let group;
    if (layout == undefined || layout == null) {
      group = createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(120),
        h: px(95),
      });
    }
    else {
      group = layout.createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(120),
        h: px(95),
      });
    }

    this.fiil_rect = group.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(120),
      h: px(95),
      radius: px(20),
      color: 0x252525
    });

    this.img = group.createWidget(widget.IMG, {
      x: px(36),
      y: 0,
      src: src,
    });
    this.img.setEnable(false);

    this.pointer = group.createWidget(widget.IMG, {
      x: px(5),
      y: px(42),
      w: px(30),
      h: px(30),
      // pos_x: 0,
      // pos_y: 0,
      center_x: px(15),
      center_y: px(15),
      src: pointer,
    });
    this.pointer.setEnable(false);

    this.value = group.createWidget(widget.TEXT, {
      x: px(30),
      y: px(42),
      w: px(90),
      h: px(30),
      text_size: px(22),
      color: 0xffffff,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: value,
    });
    this.value.setEnable(false);

    this.text = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(70),
      w: px(120),
      h: px(20),
      text_size: px(16),
      color: 0xffffff,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: text,
    });
    this.text.setEnable(false);

    let context = this;
    this.fiil_rect.addEventListener(event.CLICK_DOWN, function (info) {
      logger.log(`fiil_rect CLICK_DOWN`);
      context.posX = info.x;
      context.posY = info.y;
    });
    this.fiil_rect.addEventListener(event.CLICK_UP, function (info) {
      logger.log(`fiil_rect CLICK_UP`);
      let dX = Math.abs(info.x - context.posX);
      let dY = Math.abs(info.y - context.posY);
      context.posX = -1;
      context.posY = -1;
      logger.log(`dX = ${dX}, dY = ${dY}`);
      if (dX < 5 && dY < 5) func();
    })
    
  }

  updateValue(value, angle = 0) {
    this.value.setProperty(prop.TEXT, value);
    this.pointer.setProperty(prop.ANGLE, angle);
  }
}

class ImgAnimMove {
  constructor(src, startX, startY, endX, endY, duration, fps, layout) {
    logger.log(`ImgAnimMove   src = ${src}, startX = ${startX}, startY = ${startY}, endX = ${endX}, endY = ${endY}, duration = ${duration}, fps = ${fps}`);
    this.img = null;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.duration = duration;
    this.fps = fps;
    this.intervalID = undefined;

    if (layout == undefined || layout == null) {
      this.img = createWidget(widget.IMG, {
        x: startX,
        y: startY,
        src: src,
      });
    }
    else {
      this.img = layout.createWidget(widget.IMG, {
        x: startX,
        y: startY,
        src: src,
      });
    }
  }

  startMove() {
    logger.log(`startMove()`);
    if (this.intervalID) return;
    // logger.log(`startMove   startX = ${this.startX}, startY = ${this.startY}, endX = ${this.endX}, endY = ${this.endY}, duration = ${this.duration}, fps = ${this.fps}`);
    let timerSteps = this.duration * this.fps;
    let timerStepsCount = 0;
    let offsetX = (this.endX - this.startX) / timerSteps;
    let offsetY = (this.endY - this.startY) / timerSteps;
    let startX = this.startX;
    let startY = this.startY;
    let img = this.img;
    // logger.log(`offsetX = ${offsetX}, offsetY = ${offsetY}, timerSteps = ${timerSteps}`);
    this.intervalID = setInterval(() => {
      let xPos = startX + offsetX * timerStepsCount;
      let yPos = startY + offsetY * timerStepsCount;
      // logger.log(`intervalID() xPos = ${xPos}, yPos = ${yPos}, timerStepsCount = ${timerStepsCount}, timerSteps = ${timerSteps}`);
      img.setProperty(prop.MORE, { 
        x: xPos, 
        y: yPos,
      });
      timerStepsCount++;
      if (timerStepsCount >= timerSteps) {
        console.log('animation reload');
        timerStepsCount = 0;
      }
    }, 1000 / this.fps);
  }

  stopMove() {
    logger.log(`stopMove()`);
    if (!this.intervalID) return;
    clearInterval(this.intervalID);
    this.intervalID = undefined;
  }

  updateWidget(src, startX, startY, endX, endY, duration = 0, fps = 0) {
    logger.log(`updateWidget()`);
    this.stopMove();
    // this.img.setProperty(prop.SRC, src);
    this.img.setProperty(prop.MORE, {
      x: startX,
      y: startY,
      src: src,
    });
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    if (duration > 0) this.duration = duration;
    if (fps > 0) this.fps = fps;
  }
    
}

//#region Snow
//*******************  снегопад 2.0  ******************* by  leXxiR
// Modified by SashaCX75

		// настройки ---->
		const snowTypesNum = 11;			// количество типов снежинок
		const snowSrc_ = 'weather_img/Snow/snow_';		// префикс картинок со снежинками
	
		// let fallingSpeed = 0.95;		//	скорость снегопада общая 
		let snowMaxSpeed = 7;		//	скорость снегопада 
		let snowMinSpeed = 3;		//	скорость снегопада  
		let snowMaxSize = 50;			//	максимальный размер снежинок
		let snowMinSize = 10;			//	минимальный размер снежинок
		// <---- настройки 
			
		let snowfall

		
		// функция случайное целое
		function randomInt(...args) {
			let min = 0;
			let max = args[0];
			if (args.length > 1) {
				min = args[0];
				max = args[1];
			}
			let rand = min + Math.random() * (max + 1 - min);
			return Math.floor(rand);
		}

		// класс снежинка
		class SnowFlake {      
		  constructor() {
        this._size = randomInt(snowMinSize, snowMaxSize);
        //this._size = snowMaxSize;
        
        this._dir = 1;

        this._id = createWidget(widget.IMG, {
          x: this._x,
          y: this._y,
          w: this._size,
          h: this._size,
          src: `${snowSrc_}${randomInt(snowTypesNum-1)}.png`,
          alpha: randomInt(140, 255),
          angle: this._angle,
          center_x: this._size / 2,
          center_y: this._size / 2,
          auto_scale: true,
          auto_scale_obj_fit: true,
        });
        this._id.setEnable(false);
        
        this.init();
		  }
		  
		  init() {
        this._x = randomInt(DEVICE_WIDTH - this._size);
        this._y = Math.random() * DEVICE_HEIGHT - this._size;
        this._waveX = 0;
        this._dX = Math.random() * 25;
        this._shiftX = 0.03 + Math.random() / randomInt(5, 7);
        this._speed = randomInt(snowMinSpeed, snowMaxSpeed) * this._size / 10;
        this._angle = 90 * randomInt(3);
        this._id.setProperty(prop.MORE, {
          x: this._x,
          y: this._y
        });
		  }
		
		  move() {
			this._waveX += this._shiftX;
			this._y += this._speed;
			let newX = parseInt(this._x + this._dX * Math.sin(this._waveX));
			if (!randomInt(30)) this._dir = -this._dir;
			this._angle = (this._angle + this._dir * randomInt(18)) % 360;

			this._id.setProperty(prop.MORE, {
				x: newX,
				y: this._y,
				angle: this._angle,
				center_x: this._size / 2,
				center_y: this._size / 2,
			});
			
			
			// if (this._y > DEVICE_HEIGHT - 2 * this._size || newX > DEVICE_WIDTH - 3 * this._dX) {
			if (this._y > DEVICE_HEIGHT - this._size || newX < - this._dX || newX > DEVICE_WIDTH + this._dX - this._size ) {
				this.init();

				this._id.setProperty(prop.MORE, {
					w: this._size,
					h: this._size,
					src: `${snowSrc_}${randomInt(snowTypesNum)}.png`,
					alpha: randomInt(140, 255),
					angle: this._angle,
					center_x: this._size / 2,
					center_y: this._size / 2,
					auto_scale: true,
					auto_scale_obj_fit: true,
				});
			}
		  }

      del() {
        deleteWidget(this._id)
      }

		}


		// класс снегопад
		class Snowfall {      
		  constructor(num) {
        this._flakesNum = num
        this._moveTimer = null
        this.snowFlake = []

        for (let i = 0; i < this._flakesNum; i++) {
          this.snowFlake[i] = new SnowFlake();
        }
		  }
		
		  start() {
        logger.log(`Snowfall start()`);
        if (!this._moveTimer) {
          this._moveTimer = setInterval(() => {
            for (let i = 0; i < this.snowFlake.length; i++) {
              this.snowFlake[i].move();
            }
          }, 80);
        }
		  }

		  stop() {
        logger.log(`Snowfall stop()`);
        if (this._moveTimer) clearInterval(this._moveTimer);
        this._moveTimer = null;
		  }

		  hide() {
        logger.log(`Snowfall hide()`);
        this.stop();
        for (let i = 0; i < this._flakesNum; i++) {
          this.snowFlake[i].init();
        }			 
		  }

      del() {
        logger.log(`Snowfall del()`);
        this.stop();
        for (let i = 0; i < this.snowFlake.length; i++) {
          this.snowFlake[i].del();
        }
        this.snowFlake = [];
      }

      reLoad(num) {
        logger.log(`Snowfall reLoad(${num})`);
        logger.log(`this ${this}`);
        this.del();
        logger.log(`Snowfall del() done`);
        this._flakesNum = num

        for (let i = 0; i < this._flakesNum; i++) {
          this.snowFlake[i] = new SnowFlake();
        }
        logger.log(`Snowfall  done`);
      }

		}

//*******************  снегопад   *******************
//#endregion

//#region Rain
		//*******************************//
		//*								              *//
		//*		2023 © leXxiR 4pda		    *//
		//*								              *//
		//*******************************//
    // Modified by SashaCX75

		// настройки ---->
		const rainTypesNum = 4;			// количество типов капекль 
		const rainSrc_ = 'weather_img/Rain/drop_';		// префикс картинок с каплями
	
		let rainMinSpeed = 3;		//	скорость капекль минимальная
    let rainMaxSpeed = 5;		//	скорость капекль максимальная 
		let rainMaxSize = 30;			//	максимальный размер капекль
		let rainMinSize = 10;			//	минимальный размер капекль
    let rainAngle = -30;        // наклон дождя
		// <---- настройки 
			
		let rain


    function degreesToRadians(degrees) {
      return degrees * (Math.PI / 180);
    }

		// класс капель 
		class Drop {      
		  constructor() {
        this._size = randomInt(rainMinSize, rainMaxSize);
        this._speed = randomInt(rainMinSpeed, rainMaxSpeed) * this._size / 10;
        this.x = randomInt(DEVICE_WIDTH - this._size);
        this.y = randomInt(DEVICE_HEIGHT - this._size);
        this._angle = degreesToRadians(rainAngle);
        // logger.log(`this._size = ${this._size}, this._speed = ${this._speed}`);
        // logger.log(`this.x = ${this.x}, this.y = ${this.y}, this._angle = ${this._angle}`);
        // logger.log(`src = ${rainSrc_}${randomInt(rainTypesNum)}.png`);


        this._id = createWidget(widget.IMG, {
          x: this.x,
          y: this.y,
          w: this._size,
          h: this._size,
          // src: `weather_img/notif_wind.png`,
          src: `${rainSrc_}${randomInt(rainTypesNum)}.png`,
          alpha: randomInt(140, 255),
          angle: -rainAngle,
          center_x: this._size / 2,
          center_y: this._size / 2,
          auto_scale: true,
          auto_scale_obj_fit: true,
        });
        this._id.setEnable(false);
        
		  }
		
		  move() {
        this.x += Math.sin(this._angle) * this._speed;
        this.y += Math.cos(this._angle) * this._speed;

        this._id.setProperty(prop.MORE, {
          x: this.x,
          y: this.y
        });
        
        
        if (this.y > DEVICE_HEIGHT - this._size || newX > DEVICE_WIDTH || newX < -this._size) {
          this.x = randomInt(DEVICE_WIDTH - this._size);
          this.y = - this._size;

          this._id.setProperty(prop.MORE, {
            x: this.x,
            y: this.y,
            w: this._size,
            h: this._size,
            src: `${rainSrc_}${randomInt(rainTypesNum)}.png`,
            alpha: randomInt(140, 255),
            auto_scale: true,
            auto_scale_obj_fit: true,
          });
        }
      }

      del() {
        deleteWidget(this._id)
      }

		}


		// класс дождь
		class Rain {      
		  constructor(num) {
			this._flakesNum = num
			this._moveTimer = null
			this.rainFlake = []

			for (let i = 0; i <= this._flakesNum; i++) {
				this.rainFlake[i] = new Drop({});
			}
		  }
		
		  start() {
			if (!this._moveTimer) {
				this._moveTimer = setInterval(() => {
					for (let i = 0; i <= this._flakesNum; i++) {
						this.rainFlake[i].move();
					}
				}, 80);
			}
		  }

		  stop() {
			 if (this._moveTimer) clearInterval(this._moveTimer);
			 this._moveTimer = null;
		  }

      del() {
        logger.log(`Rain del()`);
        this.stop();
        for (let i = 0; i < this.rainFlake.length; i++) {
          this.rainFlake[i].del();
        }
        this.rainFlake = [];
      }

      reLoad(num) {
        logger.log(`Rain reLoad(${num})`);
        this.del();
        this._flakesNum = num

        for (let i = 0; i < this._flakesNum; i++) {
          this.rainFlake[i] = new Drop();
        }
      }

		}

//#endregion

// класс текст с тенью by leXxiR
class TextWithShadow {      
  constructor(props) {
  this._x = props.x || 0;
  this._y = props.y || 0;
  this._offset = props.offset || 2;
  
  this._shadow = createWidget(widget.TEXT, {
    x: this._x + this._offset,
    y: this._y + this._offset,
    w: props.w || 100,
    h: props.h || 100,
    text_size: props.text_size || 30,
    char_space: props.char_space || 0,
    line_space: props.line_space || 0,
    text: props.text,
    color: (props.color_shadow == null) ? 0x000000 : props.color_shadow,
    align_h: props.align_h || align.CENTER_H,
    align_v: props.align_v || align.CENTER_V,
    text_style: props.text_style || text_style.NONE,
  });

  this._widget = createWidget(widget.TEXT, {
    x: this._x,
    y: this._y,
    w: props.w || 100,
    h: props.h || 40,
    text_size: props.text_size || 30,
    char_space: props.char_space || 0,
    line_space: props.line_space || 0,
    text: props.text,
    color: (props.color == null) ? 0xffffff : props.color,
    align_h: props.align_h || align.CENTER_H,
    align_v: props.align_v || align.CENTER_V,
    text_style: props.text_style || text_style.NONE,
  });

  if (props.font){
    this._widget.setProperty(prop.MORE, {
      font: props.font
    });
    this._shadow.setProperty(prop.MORE, {
      font: props.font
    });
  }
  }

  hide() {
    this._widget.setProperty(prop.VISIBLE, false);
    this._shadow.setProperty(prop.VISIBLE, false);
  }

  show() {
    this._widget.setProperty(prop.VISIBLE, true);
    this._shadow.setProperty(prop.VISIBLE, true);
  }

  set visible(v) {
    if (v) this.show()
    else  this.hide();
  }
  
  set x(v) {
    this._x = v;
    this._widget.setProperty(prop.MORE, {x: this._x});
    this._shadow.setProperty(prop.MORE, {x: this._x + this._offset});
  }

  set y(v) {
    this._y = v;
    this._widget.setProperty(prop.MORE, {y: this._y});
    this._shadow.setProperty(prop.MORE, {y: this._y + this._offset});
  }

  set text(txt) {
    this._widget.setProperty(prop.TEXT, txt);
    this._shadow.setProperty(prop.TEXT, txt);
  }

  set color(v) {
    this._widget.setProperty(prop.MORE, {color: v});
  }
}

//#endregion

Page(BasePage({
  build() {
    logger.log(`build`);
    setScrollLock({ lock: true });
    setPageBrightTime({ brightTime: 60000 })

    const viewContainer = createWidget(widget.VIEW_CONTAINER, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT - px(60),
      bounce: 0,
    });

    let pod = DayOrNight();
    logger.log(`pod = ${pod}`);

    let src = pod == 'day' ? 'weather_img/bg_day.png': 'weather_img/bg_night.png';
    let sun_moon_src = pod == 'day' ? 'weather_img/sun.png': 'weather_img/moon.png';
    // logger.log(`src = ${src}`);
    // logger.log(`sun_moon_src = ${sun_moon_src}`);
    bg = createWidget(widget.IMG, {
      x: 0,
      y: 0,
      src: src,
    });

    sun_moon = createWidget(widget.IMG, {
      x: 0,
      y: 0,
      src: sun_moon_src,
    });
    SunMoonPosition(pod);

    let cloud_1_params = ['transparent_img.png', px(-400), px(-20), 0, px(-20), 25, 1];
    let cloud_2_params = ['transparent_img.png', px(-600), px(50), px(-200), px(50), 15, 1];
    let cloudiness_index = GetCloudiness();
    let cloudinessSrc = 'weather_img/notif_cloudiness_0.png';
    if (cloudiness_index > 0) cloudinessSrc = 'weather_img/notif_cloudiness_' + cloudiness_index + '.png';
    switch (cloudiness_index) {
      case 1:
        cloud_1_params = ['weather_img/cloud_01.png', px(-400), px(-20), 0, px(-20), 25, 25];
        cloud_2_params = ['weather_img/cloud_01.png', px(-600), px(50), px(-200), px(50), 15, 25];
        break;

      case 2:
        cloud_1_params = ['weather_img/cloud_02.png', px(-400), px(-30), 0, px(-30), 25, 25];
        cloud_2_params = ['weather_img/cloud_02.png', px(-600), px(135), px(-200), px(135), 10, 25];
        break;

      case 3:
        cloud_1_params = ['weather_img/cloud_03.png', px(-400), 0, 0, 0, 25, 25];
        cloud_2_params = ['weather_img/cloud_04.png', px(-600), px(65), px(-200), px(65), 10, 25];
        break;
    
    }
    imgClouds_1 = new ImgAnimMove(...cloud_1_params);
    imgClouds_2 = new ImgAnimMove(...cloud_2_params);
    if (cloudiness_index > 0) {
      imgClouds_1.startMove();
      imgClouds_2.startMove();
    };

    let mask = createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
      color: 0x000000
    });
    mask.setAlpha(55);

    //#region данные
    textCity = new TextWithShadow({
      ...TXT_CITY,
      text: "--",
    });

    textDistrict = new TextWithShadow({
      ...TXT_DISTRICT,
      text: " ",
    });

    textTemperature = new TextWithShadow({
      ...TXT_TEMPERATURE,
      text: "--",
    });

    textWeatherDescription= new TextWithShadow({
      ...TXT_WEATHER_DESCRIPTION,
      text: "--",
    });

    textTime = new TextWithShadow({
      ...TXT_WEATHER_TIME,
      text: "--:--",
    });
    //#endregion

    let notif_offsetY = NOTIF_OFFSET_Y;
    //#region Sunrise
    imgSunrise = createWidget(widget.IMG, {
      x: DEVICE_WIDTH / 2 - px(225),
      y: notif_offsetY - px(30),
      src: 'weather_img/sunrise.png',
    });
    textSunrise = new TextWithShadow({
      x: DEVICE_WIDTH / 2 - px(195),
      y: notif_offsetY - px(30),
      w: px(120),
      h: px(30),
      color: 0xffffff,
      text_size: px(22),
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: "--:--",
    });

    imgSunset = createWidget(widget.IMG, {
      x: DEVICE_WIDTH / 2 + px(195),
      y: notif_offsetY - px(30),
      src: 'weather_img/sunset.png',
    });
    textSunset = new TextWithShadow({
      x: DEVICE_WIDTH / 2 + px(75),
      y: notif_offsetY - px(30),
      w: px(120),
      h: px(30),
      color: 0xffffff,
      text_size: px(22),
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: "--:--",
    });

    imgMoonrise = createWidget(widget.IMG, {
      x: DEVICE_WIDTH / 2 - px(225),
      y: notif_offsetY + px(100),
      w: px(30),
      h: px(30),
      src: 'transparent_img.png',
    });
    textMoonrise = new TextWithShadow({
      x: DEVICE_WIDTH / 2 - px(195),
      y: notif_offsetY + px(100),
      w: px(120),
      h: px(30),
      color: 0xffffff,
      text_size: px(22),
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: '',
    });
    imgMoonset = createWidget(widget.IMG, {
      x: DEVICE_WIDTH / 2 + px(195),
      y: notif_offsetY + px(100),
      w: px(30),
      h: px(30),
      src: 'transparent_img.png',
    });
    textMoonset = new TextWithShadow({
      x: DEVICE_WIDTH / 2 + px(75),
      y: notif_offsetY + px(100),
      w: px(120),
      h: px(30),
      color: 0xffffff,
      text_size: px(22),
      align_h: align.RIGHT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: '',
    });
    //#endregion 

    notif_feelslike = new Notif(DEVICE_WIDTH/2 - px(210), notif_offsetY, getText("feels"), '--', 'weather_img/notif_temperature.png', TemperatureUnit);
    notif_pressure = new Notif(DEVICE_WIDTH/2 - px(60), notif_offsetY, getText("pressure"), '--', 'weather_img/notif_pressure.png', PressureUnit);
    notif_humidity = new Notif(DEVICE_WIDTH/2 + px(90), notif_offsetY, getText("humidity"), '--', 'weather_img/notif_humidity.png');
    notif_wind = new NotifWind(DEVICE_WIDTH/2 - px(135), notif_offsetY + px(110), getText("wind"), '--', 'weather_img/notif_wind.png', 'weather_img/wind_dir_pointer.png', WindUnit);
    notif_cloudiness = new Notif(DEVICE_WIDTH/2 + px(15), notif_offsetY + px(110), getText("cloudiness"), '--', cloudinessSrc);


    //#region  Кнопка настроек
     createWidget(widget.BUTTON, {
      ...BTN_SETTINGS,
      click_func: () => {
        console.log('settings CLICK_UP');
        push({
          url: 'page/settings',
        })
      }
    });
    //#endregion

    //#region  Кнопка информации
    createWidget(widget.BUTTON, {
      ...BTN_INFO,
      click_func: () => {
        console.log('info CLICK_UP');
        push({
          url: 'page/info',
        })
      }
    });
    //#endregion

    //#region  Кнопка графика
    createWidget(widget.BUTTON, {
      ...BTN_CHART,
      click_func: () => {
        console.log('info CLICK_UP');
        push({
          url: 'page/graf',
        })
      }
    });
    //#endregion

    // snowfall = new Snowfall(0);
    // rain = new Rain(0);

    // weatherJson.weatherIcon = 8;
    thunderstorm = createWidget(widget.IMG_ANIM, {
      anim_path: 'weather_img/Thunderstorm',
      anim_prefix: 'anim',
      anim_ext: 'png',
      anim_fps: 10,
      anim_size: 10,
      repeat_count: 1,
      anim_status: anim_status.STOP,
      x: 0,
      y: 0,
      anim_complete_call: () => {
        console.log('thunderstorm animation complete');
        if (weatherJson != undefined && weatherJson != null) {
          if (weatherJson.weatherIcon == 8) setTimeout(() => {
            thunderstorm.setProperty(prop.ANIM_STATUS, anim_status.START);
          }, 3000);
        }
      }
    });
    thunderstorm.setEnable(false);
    if (weatherJson != undefined && weatherJson != null) {
      if (weatherJson.weatherIcon == 8) thunderstorm.setProperty(prop.ANIM_STATUS, anim_status.START);
    }

    if (lastUpdateDiffTime() >= 15) {
      logger.log(`нужно обновить погоду`);
      this.getDataFromNetwork("weather");
      logger.log(`погода обновлена`);
    }
    
    updateWidget();
      
  },

  onCall(req) {
    logger.log(`onCall`);
    logger.log(`req d= ${JSON.stringify(req)}`);
  },

  getDataFromNetwork(type) {
    logger.log(`getDataFromNetwork(${type})`);
    let context = getCurrentPage();
    if (!connectStatus()){
      showToast({ content: getText("zepp_disconnected") });
      return;
    }
    let site = globalData.site;
    let urlByGeo = "";
    if (type == "weather") urlByGeo = globalData.urlByGeoWeather;
    if (type == "forecast") urlByGeo = globalData.urlByGeoForecast;
    // urlByGeo =  `https://www.accuweather.com/ru/ua/kyiv/324505/current-weather/324505`;
    logger.log(`urlByGeo = ${urlByGeo}`);
    if (urlByGeo == undefined || urlByGeo == null || urlByGeo.length == 0) {
      showToast({ content: getText("coord_not_update") });
      return;
    }
    let textID = GetTextID();
    logger.log(`textID = ${JSON.stringify(textID)}`);
    let globalDataTemp = {
      city_name: globalData.city_name,
      district: globalData.district,
      timeZone: globalData.timeZone
    }
    logger.log(`globalDataTemp = ${JSON.stringify(globalDataTemp)}`);
    logger.log(`this.request`);
    this.request({
      method: "GET",
      url: urlByGeo,
      type: type,
      site: site,
      textID: textID,
      globalData: globalDataTemp,
    })
      .then((result) => {
        logger.log(`receive data ${site}`);
        const { status, data, error } = result;
        if (status != "success") {
          logger.log(`error => ${JSON.stringify(error)}`);
          if (error.toString().includes("The allowed number of requests has been exceeded")) showToast({ content: getText("number_of_requests") });
          if (error.toString().includes("Invalid API Key")) showToast({ content: getText("APIkey_invalide") });
          return;
        }
        // logger.log(`result = ${JSON.stringify(result)}`);
        logger.log(`JSON data = ${JSON.stringify(data)}`);

        if (type == 'weather') {
          if (data != undefined && data != null) {
            globalData.weatherJson = data;
            globalData.weatherFile.set(globalData.weatherJson);
            weatherJson = globalData.weatherJson;
            updateWidget();
            showToast({content: getText("weather_update")});
            context.getDataFromNetwork("forecast");
          }
        }
        if (type == 'forecast') {
          if (data != undefined && data != null) {
            globalData.forecastJson = data;
            globalData.forecastFile.set(globalData.forecastJson);
            if (site == "AccuWeather_API" && globalData.forecastJson != undefined && globalData.forecastJson.forecast != undefined && 
              globalData.forecastJson.forecast.length > 0) {
              let forecast_element = globalData.forecastJson.forecast[0];
              if (forecast_element != undefined && forecast_element.weatherTime != undefined) {
                let date = new Date(forecast_element.weatherTime);
                let now = new Date();
                if (date.getMonth() == now.getMonth() && date.getDate() == now.getDate()) {
                  if (forecast_element.sunriseTime != undefined ) globalData.weatherJson.sunriseTime = forecast_element.sunriseTime;
                  if (forecast_element.sunsetTime != undefined ) globalData.weatherJson.sunsetTime = forecast_element.sunsetTime;
                  if (forecast_element.moonriseTime != undefined ) globalData.weatherJson.moonriseTime = forecast_element.moonriseTime;
                  if (forecast_element.moonsetTime != undefined ) globalData.weatherJson.moonsetTime = forecast_element.moonsetTime;
                  globalData.weatherFile.set(globalData.weatherJson);
                } // date.getDate() == now.getDate()
              } // forecast_element != undefined
            } // site == "AccuWeather_API"
            updateWidget();
            showToast({content: getText("forecast_update")});
          }
        }
      })
      .catch((error) => {
        console.error("error=>", error);
      });
  },
    
  onDestroy() {
    logger.log("page onDestroy invoked");
    resetPageBrightTime();
  },

}))
