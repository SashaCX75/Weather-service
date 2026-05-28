import { getText } from "@zos/i18n";
import { BasePage } from "@zeppos/zml/base-page";
import { createWidget, widget, prop, align, text_style, event, anim_status } from "@zos/ui";
import { setStatusBarVisible } from "@zos/ui";
import { showToast } from "@zos/interaction";
import { getDeviceInfo } from "@zos/device";
import { log, px } from "@zos/utils";
import { Geolocation, Time } from "@zos/sensor";
import { back, replace } from "@zos/router";
import { setPageBrightTime, resetPageBrightTime } from '@zos/display';
import * as alarmMgr from "@zos/alarm";
import { connectStatus } from '@zos/ble';
import { queryPermission, requestPermission } from "@zos/app";
import * as appService from "@zos/app-service";

import {
  BTN_BORDER_GREEN,
  BTN_BORDER_BLUE,
  BTN_BLUE,
  BTN_GREEN,
  INFO_GROUP_STYLE,
  INFO_GROUP_TEXT_STYLE,
  INFO_GROUP_TEXT_BORDER_STYLE,
  INFO_GROUP_TEXT_SECOND_STYLE,
  BTN_BACK
} from "zosLoader:./index.[pf].layout.js";

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo();
const logger = log.getLogger("Weather_Forecast.settings");
setStatusBarVisible(false);
const geolocation = new Geolocation();
const timeSensor = new Time();

const ALARM_SERVICE_NAME = "app-service/weather_alarm_service";
const SERVICE_NAME = "app-service/weather_service";
const permissions = ["device:os.bg_service"];

let globalData = getApp()._options.globalData;
let storage = globalData.storage;
let weather_service = false;
let weather_alarm_service = false;
let geoBtn;
let geoBtnBorder;
let textLat;
let textLon;
let textCity;
let slide_BG;
let slide_alarm_BG;
let radioBox;
let loadingAnimation;
let animId;

let viewContainer;

let latitude = 0;
let longitude = 0;

let smooth_graph = JSON.parse(storage.getKey('smooth_graph', false));

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

function geoCallback(/*context*/) {
  logger.log(`geoCallback`);
  logger.log(`geolocation.getStatus = ${geolocation.getStatus()}`);

  if (geolocation.getStatus() === "A") {
    let lat = Number.parseFloat(geolocation.getLatitude()).toFixed(3);
    let lon = Number.parseFloat(geolocation.getLongitude()).toFixed(3);
    // let lat = 50;
    // let lon = 30;
    globalData.latitude = lat;
    globalData.longitude = lon;
    globalData.storage.setKey("latitude", lat);
    globalData.storage.setKey("longitude", lon);
    
    geolocation.offChange(geoCallback);
    geolocation.stop();

    updateURL(/*context,*/ globalData.site, lat, lon);

  }
}

function updateCoordinates(/*context,*/ lat = 0, lon = 0 ) {
  logger.log(`lat = ${lat}, lon = ${lon}`);
  lat = lat.toString().replace(',', '.');
  lon = lon.toString().replace(',', '.');
  logger.log(`updateCoordinates`);
  lat = Number.parseFloat(lat).toFixed(3);
  lon = Number.parseFloat(lon).toFixed(3);
  
  
  globalData.latitude = lat;
  globalData.longitude = lon;
  globalData.storage.setKey("latitude", lat);
  globalData.storage.setKey("longitude", lon);

  updateURL(/*context,*/ globalData.site, lat, lon);
}

function updateURL(/*context,*/ new_site, lat = 0, lon = 0) {
  logger.log(`updateURL (${new_site})`);
  lat = Number(lat);
  lon = Number(lon);
  
  // let old_site = globalData.site;
  if (lat == 0 && lon == 0) {
    logger.log(`error coordinates`);
    showToast({ content: getText("coord_not_update"), });
    SlideSwitchSelect();
    return;
  }
  
  AnimationStart();
  const context = getCurrentPage();
  context.request({
    method: 'SET_location',
    location: {
      lat: lat,
      lon: lon
    }
  })
    .then((result) => {
      logger.log(`updateURL() SET_location result = ${JSON.stringify(result)}`);
    })
    .catch((error) => {
      logger.error("error=>", error);
    });

  if (new_site == 'OpenWeather_API') {
    //  let appid = '55ab0f5c0562074d5ffd7f7e0b104cfb';
    //  let units = 'metric';
    //  let lang = 'ru';
    let APIkey = globalData.OpenWeather_APIkey;
    if (APIkey == undefined || APIkey == null || APIkey.length < 3) {
      logger.log("error OpenWeather_APIkey");
      showToast({ content: getText("APIkey_invalide") });
      SlideSwitchSelect();
      AnimationStop();
      return;
    }
    let units = globalData.units;
    // let lang = globalData.lang;
    let lang = getText('lang');
    let cnt = 40;
    ///

    globalData.urlByGeoWeather = `https://api.openweathermap.org:443/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${APIkey}&units=${units}&lang=${lang}`;
    globalData.urlByGeoForecast = `https://api.openweathermap.org:443/data/2.5/forecast?lat=${lat}&lon=${lon}&cnt=${cnt}&appid=${APIkey}&units=${units}&lang=${lang}`;
    globalData.site = new_site;
    globalData.storage.setKey("urlByGeoWeather", globalData.urlByGeoWeather);
    globalData.storage.setKey("urlByGeoForecast", globalData.urlByGeoForecast);
    globalData.storage.setKey("site", globalData.site);
    // logger.log(`urlByGeoWeather = ${globalData.urlByGeoWeather}`);
    // logger.log(`urlByGeoForecast = ${globalData.urlByGeoForecast}`);
    logger.log(`site = ${globalData.site}`);
        
    context.getDataFromNetwork("weather");
    // setTimeout(() => {
    //   logger.log(`getDataFromNetwork forecast OpenWeather_API`);
    //   context.getDataFromNetwork("forecast");
    // }, 1500);
    return;
  }
  if (new_site == 'AccuWeather') {
    if (!connectStatus()){
      showToast({ content: getText("zepp_disconnected") });
      SlideSwitchSelect();
      AnimationStop();
      return;
    }
    let url = `https://www.accuweather.com/web-api/three-day-redirect?lat=${lat}&lon=${lon}&target`
    logger.log(`GET_location AccuWeather`);
    logger.log(`AccuWeather.URL = ${url}`);
    context.request({
      method: 'GET_location',
      url: url,
      // type: type,
      site: 'AccuWeather',
    })
      .then((result) => {
        logger.log("updateURL() result GET_location AccuWeather");
        const { status, data, error } = result;
        if (status != "success" || Object.keys(data).length < 3) {
          logger.log(`AccuWeather error => ${JSON.stringify(error)}`);
          if (error.toString().includes("The allowed number of requests has been exceeded")) showToast({ content: getText("number_of_requests") });
          // if (error.toString().includes("Invalid API Key")) showToast({ content: getText("APIkey_invalide") });
          SlideSwitchSelect();
          AnimationStop();
          return;
        }
        logger.log(`result = ${JSON.stringify(result)}`);
        logger.log(`JSON data = ${JSON.stringify(data)}`);
        
        let city_name = data.city_name;
        let city_id1 = data.city_id1;
        let city_id2 = data.city_id2;
        let location_id = data.location_id;
        logger.log(`city_name = ${city_name}`);
        logger.log(`city_id1 = ${city_id1}`);
        logger.log(`city_id2 = ${city_id2}`);
        logger.log(`location_id = ${location_id}`);

        // let lang = globalData.lang;
        let lang = getText('lang');
        //  let lang = 'ru';
        // let lang = 'en';

        globalData.urlByGeoWeather = `https://www.accuweather.com/${lang}/${location_id}/${city_name}/${city_id1}/current-weather/${city_id2}`;
        // globalData.urlByGeoWeather = `https://www.accuweather.com/${lang}/${city_name}/${city_id1}/current-weather/${city_id2}`;
        globalData.urlByGeoForecast = `https://www.accuweather.com/${lang}/${location_id}/${city_name}/${city_id1}/daily-weather-forecast/${city_id2}`;
        // globalData.urlByGeoForecast = `https://www.accuweather.com/${lang}/${city_name}/${city_id1}/daily-weather-forecast/${city_id2}`;
        globalData.site = new_site;
        globalData.storage.setKey("urlByGeoWeather", globalData.urlByGeoWeather);
        globalData.storage.setKey("urlByGeoForecast", globalData.urlByGeoForecast);
        globalData.storage.setKey("site", globalData.site);
        logger.log(`urlByGeoWeather = ${globalData.urlByGeoWeather}`);
        logger.log(`urlByGeoForecast = ${globalData.urlByGeoForecast}`);
        logger.log(`site = ${globalData.site}`);
        
        context.getDataFromNetwork("weather");
        // context.getDataFromNetwork("forecast");
        return;
      })
      .catch((error) => {
        logger.error("error=>", error);
      });
  }
  if (new_site == 'AccuWeather_API') {
    let APIkey = globalData.AccuWeather_APIkey;
    if (APIkey == undefined || APIkey == null || APIkey.length < 3) {
      logger.log("error AccuWeather_APIkey");
      showToast({ content: getText("APIkey_invalide") });
      SlideSwitchSelect();
      AnimationStop();
      return;
    }
    if (!connectStatus()){
      showToast({ content: getText("zepp_disconnected") });
      SlideSwitchSelect();
      AnimationStop();
      return;
    }
    let lang = getText('lang');
    let url = `http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${APIkey}&q=${lat},${lon}&language=${lang}`
    logger.log(`GET_location AccuWeather_API`);
    logger.log(`AccuWeather.URL = ${url}`);
    context.request({
      method: 'GET_location',
      url: url,
      // type: type,
      site: 'AccuWeather_API',
    })
      .then((result) => {
        logger.log("updateURL() result GET_location AccuWeather_API");
        const { status, data, error } = result;
        if (status != "success" || Object.keys(data).length < 3) {
          logger.log(`AccuWeather_API error => ${JSON.stringify(error)}`);
          if (error.toString().includes("The allowed number of requests has been exceeded")) showToast({ content: getText("number_of_requests") });
          if (error.toString().includes("Invalid API Key")) showToast({ content: getText("APIkey_invalide") });
          SlideSwitchSelect();
          AnimationStop();
          return;
        }
        logger.log(`result = ${JSON.stringify(result)}`);
        logger.log(`JSON data = ${JSON.stringify(data)}`);
        
        let lang = getText('lang');
        let city_key = data.city_key;
        globalData.city_name = data.city_name;
        globalData.district = data.district;
        globalData.timeZone = data.timeZone;

        globalData.urlByGeoWeather = `http://dataservice.accuweather.com/currentconditions/v1/${city_key}?apikey=${APIkey}&language=${lang}&details=true`;
        globalData.urlByGeoForecast = `http://dataservice.accuweather.com/forecasts/v1/daily/5day/${city_key}?apikey=${APIkey}&language=${lang}&details=true&metric=true`;
        globalData.site = new_site;
        globalData.storage.setKey("urlByGeoWeather", globalData.urlByGeoWeather);
        globalData.storage.setKey("urlByGeoForecast", globalData.urlByGeoForecast);
        globalData.storage.setKey("site", globalData.site);
        globalData.storage.setKey("city_name", globalData.city_name);
        globalData.storage.setKey("district", globalData.district);
        globalData.storage.setKey("timeZone", globalData.timeZone);
        logger.log(`urlByGeoWeather = ${globalData.urlByGeoWeather}`);
        logger.log(`urlByGeoForecast = ${globalData.urlByGeoForecast}`);
        logger.log(`site = ${globalData.site}`);
        
        context.getDataFromNetwork("weather");
        return;
      })
      .catch((error) => {
        logger.error("error=>", error);
      });
  }
  if (new_site == 'Sinoptik') {
    if (!connectStatus()){
      showToast({ content: getText("zepp_disconnected") });
      SlideSwitchSelect();
      AnimationStop();
      return;
    }
    // let lang = getText('lang_sinoptik');
    let url = `https://sinoptik.uk/api/location/determine`
    logger.log(`GET_location Sinoptik`);
    context.request({
      method: 'GET_location',
      url: url,
      body: JSON.stringify({
        coordinates: {
          lat: lat, 
          lng: lon
          // lat: 50, 
          // lng: 30
        }, 
        lang: getText('lang_sinoptik') // "rus" "ukr" "eng"
      }),
      site: 'Sinoptik',
    })
      .then((result) => {
        logger.log("updateURL() result GET_location Sinoptik");
        const { status, data, error } = result;
        if (status != "success" || Object.keys(data).length < 2) {
          logger.log(`Sinoptik error => ${JSON.stringify(error)}`);
          logger.log(`Sinoptik data => ${JSON.stringify(data)}`);
          showToast({ content: getText("site_error") });
          SlideSwitchSelect();
          AnimationStop();
          return;
        }
        logger.log(`result = ${JSON.stringify(result)}`);
        logger.log(`JSON data = ${JSON.stringify(data)}`);
        
        let city_name = data.city_name;
        let city_key = data.city_key;
        logger.log(`city_name = ${city_name}`);
        logger.log(`city_key = ${city_key}`);

        // let lang = globalData.lang;
        let lang = getText('lang');
        //  let lang = 'ru';
        // let lang = 'en';

        globalData.urlByGeoWeather = `https://sinoptik.uk/api/weather/location/forecast/by_id`;
        globalData.urlByGeoForecast = undefined;
        globalData.city_key = city_key;
        globalData.site = new_site;
        globalData.storage.setKey("urlByGeoWeather", globalData.urlByGeoWeather);
        globalData.storage.setKey("urlByGeoForecast", globalData.urlByGeoForecast);
        globalData.storage.setKey("site", globalData.site);
        globalData.storage.setKey("city_key", globalData.city_key);
        logger.log(`urlByGeoWeather = ${globalData.urlByGeoWeather}`);
        logger.log(`urlByGeoForecast = ${globalData.urlByGeoForecast}`);
        logger.log(`site = ${globalData.site}`);
        logger.log(`city_key = ${globalData.city_key}`);
        
        context.getDataFromNetwork("weather");
        return;
      })
      .catch((error) => {
        logger.error("error=>", error);
      });
  }
  if (new_site == 'OpenMeteo') {
    if (!connectStatus()){
      showToast({ content: getText("zepp_disconnected") });
      SlideSwitchSelect();
      AnimationStop();
      return;
    }
    let lang = getText('lang');
    let url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&layer=address&accept-language=${lang}`;
    logger.log(`GET_location OpenMeteo`);
    context.request({
      method: 'GET_location',
      url: url,
      site: 'OpenMeteo',
    })
      .then((result) => {
        logger.log("updateURL() result GET_location OpenMeteo");
        const { status, data, error } = result;
        if (status != "success" || data.city_name == undefined) {
          logger.log(`OpenMeteo error => ${JSON.stringify(error)}`);
          logger.log(`OpenMeteo data => ${JSON.stringify(data)}`);
          showToast({ content: getText("site_error") });
          SlideSwitchSelect();
          AnimationStop();
          return;
        }
        logger.log(`result = ${JSON.stringify(result)}`);
        logger.log(`JSON data = ${JSON.stringify(data)}`);
        
        globalData.city_name = data.city_name;
        globalData.district = data.district;
        globalData.storage.setKey("city_name", globalData.city_name);
        globalData.storage.setKey("district", globalData.district);
        // let city_key = data.address.postcode;
        logger.log(`city_name = ${globalData.city_name}`);
        logger.log(`district = ${globalData.district}`);

        let lang = getText('lang');

        // globalData.urlByGeoWeather = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,cloud_cover_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset&current=weather_code,temperature_2m,apparent_temperature,uv_index,cloud_cover,visibility,relative_humidity_2m,precipitation,precipitation_probability,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day&timezone=auto&wind_speed_unit=ms&temporal_resolution=hourly_6&forecast_days=10`;
        globalData.urlByGeoWeather = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&current=weather_code,temperature_2m,apparent_temperature,uv_index,cloud_cover,visibility,relative_humidity_2m,precipitation,precipitation_probability,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day&timezone=auto&wind_speed_unit=ms`;
        globalData.urlByGeoForecast = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset&hourly=weather_code,temperature_2m,apparent_temperature,uv_index,cloud_cover,visibility,relative_humidity_2m,surface_pressure&timezone=auto&wind_speed_unit=ms&temporal_resolution=hourly_6&forecast_days=10`;
        globalData.site = new_site;
        globalData.storage.setKey("urlByGeoWeather", globalData.urlByGeoWeather);
        globalData.storage.setKey("urlByGeoForecast", globalData.urlByGeoForecast);
        globalData.storage.setKey("site", globalData.site);
        logger.log(`urlByGeoWeather = ${globalData.urlByGeoWeather}`);
        logger.log(`urlByGeoForecast = ${globalData.urlByGeoForecast}`);
        logger.log(`site = ${globalData.site}`);
        
        context.getDataFromNetwork("weather");
        return;
      })
      .catch((error) => {
        logger.error("error=>", error);
        showToast({ content: getText("site_error") });
        SlideSwitchSelect();
        AnimationStop();
      });
  }

}

function updateWidget() {
  let lat = globalData.latitude;
  let lon = globalData.longitude;

  let strValue = "--";
  if (lat != 0) strValue = lat.toString();
  // textLat.setProperty(prop.TEXT, strValue);
  textLat.updateText(strValue);

  strValue = "--";
  if (lon != 0) strValue = lon.toString();
  // textLon.setProperty(prop.TEXT, strValue);
  textLon.updateText(strValue);

  strValue = "--";
  let weatherJson = globalData.weatherJson;
  if (weatherJson != undefined && weatherJson != null) {
    if (weatherJson.city != undefined && weatherJson.city != null && weatherJson.city.length > 0 ) strValue = weatherJson.city;
  }
  textCity.updateText(strValue);

  setGeoBtnStyle();
}

function setGeoBtnStyle() {
  logger.log(`setGeoBtnStyle()`);
  let latitude = globalData.latitude;
  let longitude = globalData.longitude;
  let geoNotAvailable = latitude == 0 && longitude == 0;
  let geoStyleBorder = geoNotAvailable ? { ...BTN_BORDER_GREENBTN_BORDER_BLUE } : { ...BTN_BORDER_GREEN };
  let geoStyleBtn = geoNotAvailable ? { ...BTN_BLUE } : { ...BTN_GREEN };
  let btnText = geoNotAvailable ? getText("get_geo") : getText("update_geo");

  geoBtnBorder.setProperty(prop.MORE, {
    ...geoStyleBorder,
  });
  geoBtn.setProperty(prop.MORE, {
    ...geoStyleBtn,
    text: btnText,
  });
}

function SetSlideStyle() {
  let slideText = weather_service ? getText("stop_service") : getText("start_service");
  slide_BG.updateText(slideText);
  slide_BG.updateSlide(weather_service);
  slide_BG.setEnable(weather_alarm_service);

  let slideAlarmText = weather_alarm_service ? getText("stop_alarm_service") : getText("start_alarm_service");
  slide_alarm_BG.updateText(slideAlarmText);
  slide_alarm_BG.updateSlide(weather_alarm_service);
  slide_alarm_BG.setEnable(weather_service);
}

function StartStop_AlarmBGservice() {
  logger.log('StartStop_AlarmBGservice() ')
  if (weather_alarm_service) {
    // останавливаем если есть алярмы
    alarms = alarmMgr.getAllAlarms();
    logger.log(`alarms = ${alarms}`);
    if (alarms.length > 0) {
      alarms.forEach((id) => {
        alarmMgr.cancel(id);
        logger.log(`stop alarms = ${id}`);
      });
      weather_alarm_service = !weather_alarm_service;
      SetSlideStyle();
    }
  } else {
    // запускаем алярм
    let urlByGeoWeather = globalData.urlByGeoWeather;
    let urlByGeoForecast = globalData.urlByGeoForecast;
    if (
      (urlByGeoWeather == undefined || urlByGeoWeather == null || urlByGeoWeather.length == 0) &&
      (urlByGeoForecast == undefined || urlByGeoForecast == null || urlByGeoForecast.length == 0)
    ) {
      showToast({ content: getText("coord_not_update") });
      weather_alarm_service = false;
      SetSlideStyle();
      return;
    }
    let delay = 5;
    if (urlByGeoWeather != undefined && urlByGeoWeather != null && urlByGeoWeather.length > 0) {
      let sec_deley = 60 - timeSensor.getSeconds();
      // let min_deley = 60 - timeSensor.getMinutes() - 1;
      let min_deley = 10 - timeSensor.getMinutes() % 10 - 1;
      if (min_deley < 0) min_deley += 10;
      delay = 15 + sec_deley + min_deley * 60;
      logger.log(`sec_deley = ${sec_deley}, min_deley = ${min_deley}, delay = ${delay}`);
      const param = {
        httpRequestType: "weather",
      };
      const option = {
        url: ALARM_SERVICE_NAME,
        param: JSON.stringify(param),
        store: true,
        repeat_type: alarmMgr.REPEAT_MINUTE,
        // repeat_type: alarmMgr.REPEAT_HOUR,
        repeat_period: 10,
        repeat_duration: 1,
        delay: delay,
      };
      let newAlarmId = alarmMgr.set(option);
      logger.log(`newAlarmId = ${newAlarmId}`);
      if (newAlarmId != 0) {
        weather_alarm_service = true;
        SetSlideStyle();
      }
    }
    if (urlByGeoForecast != undefined && urlByGeoForecast != null && urlByGeoForecast.length > 0) {
      delay += 45;
      const param = {
        httpRequestType: "forecast",
      };
      const option = {
        url: ALARM_SERVICE_NAME,
        param: JSON.stringify(param),
        store: true,
        repeat_type: alarmMgr.REPEAT_MINUTE,
        // repeat_type: alarmMgr.REPEAT_HOUR,
        repeat_period: 10,
        repeat_duration: 1,
        delay: delay,
      };
      let newAlarmId = alarmMgr.set(option);
      logger.log(`newAlarmId = ${newAlarmId}`);
    }
  }
}

function StartStop_BGservice() {
  logger.log('StartStop_BGservice() ')
  if (weather_service) {
    // останавливаем если запущен
    stopWeatherService();
  } else {
    // запускаем сервис
    permissionRequest();
  }
}

function permissionRequest() {
  logger.log(`permissionRequest`);

  const [result] = queryPermission({
    permissions,
  });

  if (result === 0) {
    requestPermission({
      permissions,
      callback([result_callback]) {
        if (result_callback === 2) {
          startWeatherService();
        }
      },
    });
  } else if (result === 2) {
    startWeatherService();
  }
}

function startWeatherService() {
  logger.log(`=== start service: ${SERVICE_NAME} ===`);
  let param = {
    action: "start",
  };
  const result = appService.start({
    url: SERVICE_NAME,
    param: JSON.stringify(param),
    complete_func: (info) => {
      logger.log(`startService result: ` + JSON.stringify(info));
      // showToast({ content: `start result: ${info.result}` });
      // refresh for button status

      if (info.result) {
        weather_service = true;
        SetSlideStyle();
        // showToast({ content: getText("service_start") });
      }
    },
  });

  if (result) {
    logger.log("startService result: ", result);
  }
}

function stopWeatherService() {
  logger.log(`=== stop service: ${SERVICE_NAME} ===`);
  appService.stop({
    url: SERVICE_NAME,
    param: `service=${SERVICE_NAME}&action=stop`,
    complete_func: (info) => {
      logger.log(`stopService result: ` + JSON.stringify(info));
      // showToast({ content: `stop result: ${info.result}` });
      // refresh for button status

      if (info.result) {
        weather_service = false;
        SetSlideStyle();
        // showToast({ content: getText("service_stop") });
      }
    },
  });
}

function SiteChanged(index) {
  logger.log(`siteChanged(${index})`);
  let lat = globalData.latitude;
  let lon = globalData.longitude;
  let new_site = globalData.site;
  let old_site = globalData.site;
  if (lat == 0 && lon == 0) {
    logger.log(`error coordinates`);
    SlideSwitchSelect();
    showToast({ content: getText("coord_not_update") });
    return;
  }
  // let lang = globalData.lang;
  switch (index) {

    case 0: // OpenWeather_API
      new_site = 'OpenWeather_API';
      break;
    
    case 1: // AccuWeather
      new_site = 'AccuWeather';
      break;
    
    case 2: // AccuWeather_API
      new_site = 'AccuWeather_API';
      break;
    
    case 3: // Sinoptik
      new_site = 'Sinoptik';
      break;
    
    case 4: // OpenMeteo
      new_site = 'OpenMeteo';
      break;
  }
  
  logger.log(`siteChanged(old_site = ${old_site}, new_site = ${new_site})`);
  if (new_site != old_site) {
    updateURL(new_site, lat, lon);
  }
}

function SlideSwitchSelect () {
  logger.log(`SlideSwitchSelect`);
  let select_index = 0;
  switch (globalData.site) {
    case 'OpenWeather_API':
      select_index = 0;
      break;

    case 'AccuWeather':
      select_index = 1;
      break;
      
    case 'AccuWeather_API':
      select_index = 2;
      break;
      
    case 'Sinoptik':
      select_index = 3;
      break;
      
    case 'OpenMeteo':
      select_index = 4;
      break;

    default:
      select_index = 0;
      break;
  };
  radioBox.SetSelect(select_index);
}

function AnimationStart() {
  loadingAnimation.setProperty(prop.ANIM_STATUS, {
    anim_id: animId,
    anim_status: anim_status.STOP
  });
  loadingAnimation.setProperty(prop.ANIM_STATUS, {
    anim_id: animId,
    anim_status: anim_status.START
  }); 
  let pos_y = viewContainer.getProperty(prop.POS_Y);
  viewContainer.setProperty(prop.MORE, {
    // x: 0,
    // y: 0,
    // w: DEVICE_WIDTH,
    // h: DEVICE_HEIGHT - px(60),
    z_index: -1,
  })  
  viewContainer.setProperty(prop.POS_Y, pos_y);
  loadingAnimation.setProperty(prop.VISIBLE, true);
}

function AnimationStop() {
  loadingAnimation.setProperty(prop.ANIM_STATUS, {
    anim_id: animId,
    anim_status: anim_status.STOP
  });
  let pos_y = viewContainer.getProperty(prop.POS_Y);
  viewContainer.setProperty(prop.MORE, {
    // x: 0,
    // y: 0,
    // w: DEVICE_WIDTH,
    // h: DEVICE_HEIGHT - px(60),
    z_index: 0,
  });
  viewContainer.setProperty(prop.POS_Y, pos_y);
  loadingAnimation.setProperty(prop.VISIBLE, false);
}
//#endregion

class TextField {
  constructor(x = 0, y = 0, text = '', textField = '', layout ) {
    let group;
    if (layout == undefined || layout == null) {
      group = createWidget(widget.GROUP, {
        ...INFO_GROUP_STYLE,
        y: y,
      });
    }
    else {
      group = layout.createWidget(widget.GROUP, {
        ...INFO_GROUP_STYLE,
        y: y,
      });
    }

    group.createWidget(widget.TEXT, {
      ...INFO_GROUP_TEXT_STYLE,
      text: text,
    });
    group.createWidget(widget.STROKE_RECT, {
      ...INFO_GROUP_TEXT_BORDER_STYLE,
    });
    this.textField = group.createWidget(widget.TEXT, {
      ...INFO_GROUP_TEXT_SECOND_STYLE,
      text: textField,
    });
  }

  updateText(newText) {
    this.textField.setProperty(prop.TEXT, newText);
  }
}

class SlideSwitch {
  constructor(y = 0, group_width, slide_switch_checked, layout, text_on, text_off, func) {
    this.text_on = text_on;
    this.text_off = text_off;
    this.color_on = 0x1D841D;
    this.color_off = 0x821C1C;
    this.posX = -1;
    this.posY = -1;

    let group;
    if (layout == undefined || layout == null) {
      group = createWidget(widget.GROUP, {
        x: (DEVICE_WIDTH - group_width) / 2,
        y: y,
        w: group_width,
        h: px(80),
      });
    }
    else {
      group = layout.createWidget(widget.GROUP, {
        x: (DEVICE_WIDTH - group_width) / 2,
        y: y,
        w: group_width,
        h: px(80),
      });
    }

    let slideText = slide_switch_checked ? text_on : text_off;
    this.text = group.createWidget(widget.TEXT, {
      x: px(95),
      y: 0,
      w: group_width - px(115),
      h: px(80),
      color: 0xffffff,
      text_size: px(28),
      line_space: -px(20),
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: slideText
    });
    // this.text.setEnable(false);
    this.slide_switch = group.createWidget(widget.SLIDE_SWITCH, {
      x: px(10),
      y: px(80 - 50)/2,
      w: px(75),
      h: px(50),
      select_bg: 'switch_on.png',
      un_select_bg: 'switch_off.png',
      slide_src: 'radio_select.png',
      slide_select_x: px(30),
      slide_un_select_x: px(5),
      checked: slide_switch_checked,
      checked_change_func: (slideSwitch, checked) => {
        logger.log('checked', checked)
      }
    });

    let color = slide_switch_checked ? this.color_on : this.color_off;
    this.stroke_rect = group.createWidget(widget.STROKE_RECT, {
      x: 0,
      y: 0,
      w: group_width,
      h: px(80),
      radius: px(25),
      line_width: 3,
      color: color // 0x313131 // 0xa0a0a0
    });

    let context = this;
    this.stroke_rect.addEventListener(event.CLICK_DOWN, function (info) {
      // logger.log(`stroke_rect CLICK_DOWN`);
      context.posX = info.x;
      context.posY = info.y;
    });
    this.stroke_rect.addEventListener(event.CLICK_UP, function (info) {
      // logger.log(`stroke_rect CLICK_UP`);
      let dX = Math.abs(info.x - context.posX);
      let dY = Math.abs(info.y - context.posY);
      context.posX = -1;
      context.posY = -1;
      // logger.log(`dX = ${dX}, dY = ${dY}`);
      if (dX < 5 && dY < 5) func();
    })

    this.mask = group.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: group_width,
      h: px(80),
      radius: px(25),
      line_width: 3,
      color: 0x000000
    });
    this.mask.setAlpha(150);

  }

  updateText(newText) {
    this.text.setProperty(prop.TEXT, newText);
  }

  updateSlide(slide_switch_checked) {
    this.slide_switch.setProperty(prop.CHECKED, slide_switch_checked);
    let slideText = slide_switch_checked ? text_on : text_off;
    this.text.setProperty(prop.TEXT, slideText);
    let color = slide_switch_checked ? this.color_on : this.color_off;
    this.stroke_rect.setProperty(prop.COLOR, color);
  }

  setEnable(enable) {
    this.mask.setEnable(enable);
    this.mask.setProperty(prop.VISIBLE, enable);
  }

}

class RadioBox {
  constructor(y = 0, group_width, layout, text_arrey, src_arrey, select_index = 0) {
    logger.log(`RadioBox constructor`);
    logger.log(`text_arrey.length = ${text_arrey.length}, src_arrey.length = ${src_arrey.length}, select_index = ${select_index}`);
    if (text_arrey.length == 0 || src_arrey.length != text_arrey.length ) return;
    if (select_index < 0 || select_index >= text_arrey.length) select_index = 0;
    this.initialisation = false;
    this.radioGroup;
    this.posX = -1;
    this.posY = -1;

    if (layout == undefined || layout == null) {
      this.radioGroup = createWidget(widget.RADIO_GROUP, {
        x: (DEVICE_WIDTH - group_width) / 2,
        y: y,
        w: group_width,
        h: 100,
        select_src: 'radioGroup_on.png',
        unselect_src: 'radioGroup_off.png',
        check_func: (group, index, checked) => {
          if (checked && this.initialisation) {
            logger.log('index', index);
            logger.log('checked', checked);
            if (index < text_arrey.length) SiteChanged(index);
          }
        }
      });
      this.group = createWidget(widget.GROUP, {
        x: (DEVICE_WIDTH - group_width) / 2,
        y: y,
        w: group_width,
        h: 100,
      });
    }
    else {
      this.radioGroup = layout.createWidget(widget.RADIO_GROUP, {
        x: (DEVICE_WIDTH - group_width) / 2,
        y: y,
        w: group_width,
        h: 100,
        select_src: 'radioGroup_on.png',
        unselect_src: 'radioGroup_off.png',
        check_func: (group, index, checked) => {
          if (checked && this.initialisation) {
            logger.log('index', index);
            logger.log('checked', checked);
            if (index < text_arrey.length) SiteChanged(index);
          }
        }
      });
      this.group = layout.createWidget(widget.GROUP, {
        x: (DEVICE_WIDTH - group_width) / 2,
        y: y,
        w: group_width,
        h: 100,
      });
    }

    this.state_button = [];
    for (let index = 0; index < text_arrey.length; index++) {
      this.state_button.push(
        this.radioGroup.createWidget(widget.STATE_BUTTON, {
          x: 5,
          y: px(index*100 + 10),
          w: px(60),
          h: px(60),
        })
      );

    }

    this.radioGroup.setProperty(prop.INIT, this.state_button[select_index]);
    this.initialisation = true;

    // this.logo = [];
    this.stroke_rect = [];
    let radioGroup = this.radioGroup;
    let state_button_array = this.state_button;
    let context = this;
    for (let index = 0; index < text_arrey.length; index++) {
      this.group.createWidget(widget.IMG, {
        x: px(70),
        y: px(index*100 + 15),
        src: src_arrey[index]
      })

      this.group.createWidget(widget.TEXT, {
        x: px(130),
        y: px(index*100),
        w: group_width + px(100),
        h: px(80),
        color: 0xffffff,
        text_size: px(28),
        align_h: align.LEFT,
        align_v: align.CENTER_V,
        text_style: text_style.NONE,
        text: text_arrey[index]
      });

      this.stroke_rect.push(
        this.group.createWidget(widget.STROKE_RECT, {
          x: 0,
          y: px(index*100),
          w: group_width,
          h: px(80),
          radius: px(25),
          line_width: 3,
          color: 0x313131
        })
      );

      this.stroke_rect[index].addEventListener(event.CLICK_DOWN, function (info) {
        // logger.log(`stroke_rect[${index}] CLICK_DOWN`);
        context.posX = info.x;
        context.posY = info.y;
      });
      this.stroke_rect[index].addEventListener(event.CLICK_UP, function (info) {
        // logger.log(`stroke_rect[${index}] CLICK_UP`);
        let dX = Math.abs(info.x - context.posX);
        let dY = Math.abs(info.y - context.posY);
        context.posX = -1;
        context.posY = -1;
        // logger.log(`dX = ${dX}, dY = ${dY}`);
        if (dX < 5 && dY < 5) radioGroup.setProperty(prop.CHECKED, state_button_array[index]);
      });

    }
    this.group.createWidget(widget.FILL_RECT, {
      x: 0,
      y: px(text_arrey.length*100),
      w: group_width,
      h: 10,
      color: 0x000000
    })
  }

  SetSelect(select_index = 0) {
    logger.log(`SetSelect select_index = ${select_index}`);
    logger.log(`CHECKED = ${this.radioGroup.getProperty(prop.CHECKED, this.state_button[select_index])}`);
    if (!this.radioGroup.getProperty(prop.CHECKED, this.state_button[select_index])) this.radioGroup.setProperty(prop.CHECKED, this.state_button[select_index]);
  }
}

class CheckBoxVector {
  constructor(props = {}) {
    this.text = text;
    this.checked = checked;
    // logger.log(`CheckBoxVector constructor`);
    this.props = {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: px(56),
      offset: px(10),										// отступ названия от переключателя
      text_color: 0xffffff,							// цвет названия
      text_size: px(32),				        // размер текста
      text: '',												  // текст названия переключателя					
      char_space: 0,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      line_space: px(-22),
      bg_offColor: 0x313131,            // Цвет фона в неактивном состоянии.
      bg_onColor: 0x0986d4,             // Необязательный параметр, цвет фона в активном состоянии
      fg_offColor: 0x555555,            // Цвет ползунка в активном состоянии
      fg_onColor: 0xffffff,             // Необязательный параметр, цвет ползунка в активном состоянии
      checked: false,                   // Необязательный параметр, состояние переключателя
      click_func: null,									// функция на нажатие
      ...props,
    };

    if (this.props.group == undefined || this.props.group == null) this.props.group = createWidget(widget.GROUP, {
      x: 0,
      y: 0,
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT,
    });

    if (this.props.bg_size == undefined || this.props.bg_size == null) this.props.bg_size = this.props.h;
    if (this.props.fg_size == undefined || this.props.fg_size == null) this.props.fg_size = this.props.h / 2;
    if (this.props.bg_radius == undefined || this.props.bg_radius == null) this.props.bg_radius = this.props.bg_size / 4.5;
    if (this.props.fg_radius == undefined || this.props.fg_radius == null) this.props.fg_radius = this.props.fg_size / 3;

    if (this.props.click_func == null) this.props.click_func = () => { };
    this.props.w = props.w ?? this.props.w - this.props.x;
    if (this.props.w < this.props.bg_size) this.props.w = this.props.bg_size;
    this.props.check_box_offsetBg = (this.props.h - this.props.bg_size) / 2;
    this.props.check_box_offsetFg_Y = (this.props.h - this.props.fg_size) / 2;
    this.props.check_box_offsetFg_X = (this.props.bg_size - this.props.fg_size) / 2;

    this._checkBoxBg = '';
    this._checkBoxFg = '';
    this._caption = '';
    this._rect = '';
    this.create();
  }

  // создаем переключатель
  create() {
    // logger.log(`CheckBoxVector create`);

    // задний фон переключателя
    this._checkBoxBg = this.props.group.createWidget(widget.FILL_RECT, {
      x: this.props.x,
      y: this.props.y + this.props.check_box_offsetBg,
      w: this.props.bg_size,
      h: this.props.bg_size,
      radius: this.props.bg_radius,
      color: this.props.checked ? this.props.bg_onColor : this.props.bg_offColor,
    });

    // точка на переключателе
    this._checkBoxFg = this.props.group.createWidget(widget.FILL_RECT, {
      x: this.props.x + this.props.check_box_offsetFg_X,
      y: this.props.y + this.props.check_box_offsetFg_Y,
      w: this.props.fg_size,
      h: this.props.fg_size,
      radius: this.props.bg_radius,
      color: this.props.checked ? this.props.fg_onColor : this.props.fg_offColor,
    });

    // заголовок переключателя
    this._caption = this.props.group.createWidget(widget.TEXT, {
      ...this.props,
      x: this.props.x + this.props.bg_size + this.props.offset,
      // y: this.props.y ,
      w: this.props.w > this.props.bg_size ? this.props.w - (this.props.bg_size + this.props.offset) : 0,
      // h: this.props.h,
      color: this.props.text_color,
      text: this.props.text,
    });

    // область реагирования на нажатия
    this._rect = this.props.group.createWidget(widget.STROKE_RECT, {
      ...this.props,
      alpha: 0,
      color: 0x000000,
    });
    this._rect.addEventListener(event.CLICK_UP, (info) => this.onClickUp(info, index));
  }

  // обработчик нажатия на переключатель
  onClickUp() {
    logger.log(`CheckBoxVector onClickUp()`);
    this.toggle();
  }

  // переключить состояние
  toggle() {
    logger.log(`toggle from ${this.props.checked} to ${!this.props.checked}`);
    this.props.checked = !this.props.checked;
    this._checkBoxBg.setProperty(prop.COLOR, this.props.checked ? this.props.bg_onColor : this.props.bg_offColor);
    this._checkBoxFg.setProperty(prop.COLOR, this.props.checked ? this.props.fg_onColor : this.props.fg_offColor);
    this.props.click_func(this.props.checked);
  }

}

Page(
  BasePage({
    build() {
      logger.log(`build`);
      // logger.warn(`warn`);
      // logger.debug(`debug`);
      // logger.info(`info`);
      // logger.error(`test`);
      // globalData.storage.deleteAll();
      latitude = globalData.latitude;
      longitude = globalData.longitude;
      // latitude = 0;
      // longitude = 0;
      this.getDataFromZepp();
      const result = setPageBrightTime({
        brightTime: 60000,
      })
      if (result === 0) logger.log('setPageBrightTime success')

      alarms = alarmMgr.getAllAlarms();
      logger.log(`alarms count = ${alarms}`);
      // if (alarms.length > 0) weather_alarm_service = true;
      // else weather_alarm_service = false;
      let services = appService.getAllAppServices();
      logger.log(`services = ${services}`);
      weather_service = services.includes(SERVICE_NAME);
      weather_alarm_service = alarms.length > 0;
      logger.log(`weather_service = ${weather_service}`);
      logger.log(`weather_alarm_service = ${weather_alarm_service}`);

      viewContainer = createWidget(widget.VIEW_CONTAINER, {
        x: 0,
        y: 0,
        w: DEVICE_WIDTH,
        h: DEVICE_HEIGHT - px(60),
        z_index: 0,
      });
      createWidget(widget.PAGE_SCROLLBAR, { target: viewContainer });

      let strValue = "--";
      //#region City
      let weatherJson = globalData.weatherJson;
      if (weatherJson != undefined && weatherJson != null) {
        if (weatherJson.city != undefined && weatherJson.city != null && weatherJson.city.length > 0 ) strValue = weatherJson.city;
      }

      textCity = new TextField(0, px(30), getText("city"), strValue, viewContainer);
      //#endregion

      strValue = "--";
      //#region Latitude
      if (latitude != 0) strValue = latitude.toString();

      textLat = new TextField(0, px(30 + 85), getText("latitude"), strValue, viewContainer);
      //#endregion

      strValue = "--";
      //#region Longitude
      if (longitude != 0) strValue = longitude.toString();

      textLon = new TextField(0, px(30 + 2 * 85), getText("longitude"), strValue, viewContainer);
      //#endregion

      //#region  Кнопка поиска координат
      let geoNotAvailable = latitude == 0 && longitude == 0;
      let geoStyleBorder = geoNotAvailable ? { ...BTN_BORDER_BLUE } : { ...BTN_BORDER_GREEN };
      let geoStyleBtn = geoNotAvailable ? { ...BTN_BLUE } : { ...BTN_GREEN };
      let btnText = geoNotAvailable ? getText("get_geo") : getText("update_geo");
      geoBtnBorder = viewContainer.createWidget(widget.STROKE_RECT, {...geoStyleBorder} );
      geoBtn = viewContainer.createWidget(widget.BUTTON, {
        ...geoStyleBtn,
        text: btnText,
        click_func: () => {
          logger.log("geoBtn CLICK_UP");
          AnimationStart();
          geolocation.start();
          geolocation.onChange(geoCallback());
        },
      });
      //#endregion

      //#region разделитель
      viewContainer.createWidget(widget.FILL_RECT, {
        x: (DEVICE_WIDTH - px(400)) / 2,
        y: px(370),
        w: px(400),
        h: 3,
        color: 0xa0a0a0
      })
      //#endregion
      
      //#region переключатель фоновой службы
      // let slideText = weather_service ? getText("stop_service") : getText("start_alarm_service");
      slide_BG = new SlideSwitch (px(390), px(370), weather_service, viewContainer, getText("stop_service"), getText("start_service"), StartStop_BGservice);
      slide_alarm_BG = new SlideSwitch (px(490), px(370), weather_alarm_service, viewContainer, getText("stop_alarm_service"), getText("start_alarm_service"), StartStop_AlarmBGservice);
      viewContainer.createWidget(widget.TEXT, {
        x: (DEVICE_WIDTH - px(400)) / 2,
        y: px(580),
        w: px(400), 
        h: px(140),
        text: getText("bg_servise_hint"),
        color: 0xffffff,
        text_size: px(18),
        align_h: align.CENTER_H,
        align_v: align.TOP,
        text_style: text_style.WRAP,
      });
      SetSlideStyle();
      //#endregion

      let site_block_offset = px(730);
      //#region разделитель 2
      viewContainer.createWidget(widget.FILL_RECT, {
        x: (DEVICE_WIDTH - px(400)) / 2,
        y: site_block_offset,
        w: px(400),
        h: 3,
        color: 0xa0a0a0
      })
      //#endregion

      //#region выбор сайта
      let text_arrey = [getText("site_OpenWeather_API"), getText("site_AccuWeather"), getText("site_AccuWeather_API"), getText("site_Sinoptik"), getText("site_OpenMeteo")];
      let src_arrey = ['logo_OpenWeather.png', 'logo_AccuWeather.png', 'logo_AccuWeather.png', 'logo_Sinoptik.png', 'logo_OpenMeteo.png'];
      // let text_arrey = [getText("site_OpenWeather_API"), getText("site_AccuWeather"), getText("site_AccuWeather_API")];
      // let src_arrey = ['logo_OpenWeather.png', 'logo_AccuWeather.png', 'logo_AccuWeather.png'];
      let select_index = 0;
      switch (globalData.site) {
        case 'OpenWeather_API':
          select_index = 0;
          break;

        case 'AccuWeather':
          select_index = 1;
          break;
          
        case 'AccuWeather_API':
          select_index = 2;
          break;
          
        case 'Sinoptik':
          select_index = 3;
          break;
          
        case 'OpenMeteo':
          select_index = 4;
          break;
      
        default:
          select_index = 0;
          break;
      };
      logger.log(`select_index = ${select_index}`);
      radioBox = new RadioBox (site_block_offset + px(20), px(390), viewContainer, text_arrey,src_arrey, select_index);
      //#endregion

      // let temp_mask = viewContainer.createWidget(widget.FILL_RECT, {
      //   x: (DEVICE_WIDTH - px(370)) / 2,
      //   y: site_block_offset + px(220),
      //   w: px(370),
      //   h: px(80),
      //   radius: px(25),
      //   color: 0x000000
      // })
      // temp_mask.setAlpha(150);

      //#region разделитель 3
      viewContainer.createWidget(widget.FILL_RECT, {
        x: (DEVICE_WIDTH - px(400)) / 2,
        // y: site_block_offset + px(320),
        y: site_block_offset + px(520),
        w: px(400),
        h: 3,
        color: 0xa0a0a0
      })
      //#endregion

      //#region сглаженный график
      new CheckBoxVector({
        x: (DEVICE_WIDTH - px(370)) / 2,
        y: site_block_offset + px(520),
        w: px(370),
        h: px(80),
        checked: smooth_graph,
        text: getText("smooth_graph_text"),
        group: viewContainer,
        text_size: px(26),
        bg_size: px(40),
        fg_size: px(24),
        offset: px(10),
        click_func: (checked) => {
          logger.log(`click_func`);
          smooth_graph = checked;
          storage.setKey('smooth_graph', smooth_graph);
        },
      });
      //#endregion

      //#region разделитель 3
      viewContainer.createWidget(widget.FILL_RECT, {
        x: (DEVICE_WIDTH - px(400)) / 2,
        // y: site_block_offset + px(320),
        y: site_block_offset + px(600),
        w: px(400),
        h: 3,
        color: 0xa0a0a0
      })
      //#endregion

      //#region Donate
      viewContainer.createWidget(widget.TEXT, {
        x: (DEVICE_WIDTH - px(400)) / 2,
        // y: site_block_offset + px(340),
        y: site_block_offset + px(620),
        w: px(400), 
        h: px(100),
        text: getText("Donate"),
        color: 0xffffff,
        text_size: px(26),
        line_space: -10,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.WRAP,
      });

      viewContainer.createWidget(widget.IMG, {
        x: (DEVICE_WIDTH - px(250)) / 2,
        // y: site_block_offset + px(450),
        y: site_block_offset + px(730),
        w: px(250),
        h: px(250),
        src: 'bmc_qr.png',
        auto_scale: true,
        auto_scale_obj_fit: true,
      })
      //#endregion

      //#region Кнопка Назад
      createWidget(widget.BUTTON, {
        ...BTN_BACK,
        click_func: () => {
          logger.log("button back click");
          back();
        },
      });
      //#endregion
   
      loadingAnimation = createWidget(widget.IMG, {
        x: (DEVICE_WIDTH - px(160)) / 2,
        y: (DEVICE_HEIGHT - px(160)) / 2,
        center_x: px(80),
        center_y: px(80),
        src: 'loading.png',
      });
      loadingAnimation.setEnable(false);
      loadingAnimation.setProperty(prop.VISIBLE, false);

      const loading_animation_param = {
        anim_rate: 'linear',
        anim_duration: 2000,
        anim_from: 0,
        anim_to: 360,
        anim_prop: prop.ANGLE
      }
      animId = loadingAnimation.setProperty(prop.ANIM, {
        anim_steps: [loading_animation_param],
        anim_repeat: -1,
        anim_auto_start: 0,
        anim_auto_destroy: 0,
        anim_fps: 25
      })

    },

    onResume() {
      logger.log("page on resume invoke");
      replace({ url: `page/settings` });
    }, 

    onCall(req) {
      logger.log(`onCall`);
      // logger.log(`req ${JSON.stringify(req)}`);
      const { result } = req;
      if (Object.keys(result).length > 0) {
        logger.log(`result ${JSON.stringify(result)}`);
        if (result.key != undefined && result.newValue != undefined) {
          if (result.key == 'data') {
            let newValue = JSON.parse(result.newValue);
            let lat = newValue.latitude;
            let lon = newValue.longitude;
            updateCoordinates(/*this,*/ lat, lon);
          }
          if (result.key == 'latitude') {
            let lat = result.newValue;
            let lon = globalData.longitude;
            updateCoordinates(/*this,*/ lat, lon);
          }
          if (result.key == 'longitude') {
            let lat = globalData.latitude;
            let lon = result.newValue;
            updateCoordinates(/*this,*/ lat, lon);
          }
        }
      }
    },

    getDataFromNetwork(type) {
      logger.log(`getDataFromNetwork(${type})`);
      const context = getCurrentPage();
      let textID = GetTextID();
      if (!connectStatus()){
        showToast({ content: getText("zepp_disconnected") });
        SlideSwitchSelect();
        AnimationStop();
        return;
      }
      let site = globalData.site;
      let urlByGeo = "";
      if (type == "weather") urlByGeo = globalData.urlByGeoWeather;
      if (type == "forecast") urlByGeo = globalData.urlByGeoForecast;
      // urlByGeo =  'https://bible-api.com/john%203:16';
      logger.log(`urlByGeo = ${urlByGeo}`);
      if (urlByGeo == undefined || urlByGeo == null || urlByGeo.length == 0) {
        showToast({ content: getText("coord_not_update"), });
        AnimationStop();
        return;
      }
      let globalDataTemp = {
        city_name: globalData.city_name,
        district: globalData.district,
        timeZone: globalData.timeZone
      }
      let body_request = undefined;
      if (site == "Sinoptik") {
        body_request = JSON.stringify({
          lang: getText('lang_sinoptik'), // "rus" "ukr" "eng"
          location_id: globalData.city_key,
          forecast_days: 10,
        });
      }
      this.request({
        method: "GET",
        url: urlByGeo,
        type: type,
        site: site,
        body: body_request,
        textID: textID,
        globalData: globalDataTemp,
      })
        .then((result) => {
          logger.log(`result getDataFromNetwork (${site})`);
          AnimationStop();
          const { status, data, error } = result;
          if (status != "success" || Object.keys(data).length < 2) {
            logger.log(`error => ${JSON.stringify(error)}`);
            if (error.toString().includes("The allowed number of requests has been exceeded")) showToast({ content: getText("number_of_requests") });
            if (error.toString().includes("Invalid API Key")) showToast({ content: getText("APIkey_invalide") });
            return;
          }
          logger.log(`result = ${JSON.stringify(result)}`);
          logger.log(`JSON data = ${JSON.stringify(data)}`);

          if (type == "weather") {
            globalData.weatherJson = data;
            if (site == "Sinoptik") { // для сайтов с объединенной погодой и прогнозом
              globalData.weatherJson = data.weather;
              globalData.forecastJson = data.forecast;
              globalData.forecastFile.set(globalData.forecastJson);
            }
            showToast({ content: getText("weather_update") });
            globalData.weatherFile.set(globalData.weatherJson);
            updateWidget();
            // context.getDataFromNetwork("forecast");
            if (site != "Sinoptik") setTimeout(() => {
              logger.log(`getDataFromNetwork setTimeout forecast`);
              context.getDataFromNetwork("forecast");
            }, 1500);
          }
          if (type == "forecast") {
            globalData.forecastJson = data;
            showToast({ content: getText("forecast_update") });
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
          }
        })
        .catch((error) => {
          logger.error("error=>", error);
        });
    },

    getDataFromZepp() {
      logger.log(`getDataFromZepp()`);
      if (!connectStatus()){
        showToast({ content: getText("zepp_disconnected") });
        return;
      }
      this.request({
        method: "GET_settings",
      })
        .then((result) => {
          logger.log("receive settings");
          logger.log(`result = ${JSON.stringify(result)}`);
          if (Object.keys(result).length < 1) {
            logger.log("error data");
            return;
          }
  
          showToast({ content: getText("settings_update") });
          let lat = globalData.latitude;
          let lon = globalData.longitude;
          logger.log(`lat = ${lat}, lon = ${lon}`);
          if (result.latitude != undefined && result.latitude != 0) {
            // globalData.latitude = result.latitude;
            // globalData.storage.setKey("latitude", result.latitude);
            let latStr = result.latitude.toString();
            latStr = latStr.replace(",", ".");
            lat = Number.parseFloat(latStr).toFixed(3);
          }
          if (result.longitude != undefined && result.longitude != 0) {
            // globalData.longitude = result.longitude;
            // globalData.storage.setKey("longitude", result.longitude);
            let lonStr = result.longitude.toString();
            lonStr = lonStr.replace(",", ".");
            lon = Number.parseFloat(lonStr).toFixed(3);
          }
          if (result.OpenWeather_APIkey != undefined && result.OpenWeather_APIkey != 0) {
            if (result.OpenWeather_APIkey.length > 0) {
              globalData.OpenWeather_APIkey = result.OpenWeather_APIkey;
              globalData.storage.setKey("OpenWeather_APIkey", result.OpenWeather_APIkey);
            }
            else {
              globalData.OpenWeather_APIkey = 'fc95cd22842af9f54cf6ba3ec231c9c7';
              globalData.storage.setKey("OpenWeather_APIkey", 'fc95cd22842af9f54cf6ba3ec231c9c7');
            }
          }
          if (result.AccuWeather_APIkey != undefined && result.AccuWeather_APIkey != 0) {
            globalData.AccuWeather_APIkey = result.AccuWeather_APIkey;
            globalData.storage.setKey("AccuWeather_APIkey", result.AccuWeather_APIkey);
          }
  
          if(lat != globalData.latitude || lon != globalData.longitude) {
            updateCoordinates(/*this,*/ lat, lon);
          }
        })
        .catch((error) => {
          logger.error("error=>", error);
        });
    },
    
    onDestroy() {
      logger.log("page onDestroy invoked");
      resetPageBrightTime();
      geolocation.offChange(geoCallback);
      geolocation.stop();
    },
  })
);
