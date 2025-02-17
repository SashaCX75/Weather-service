import { getText } from "@zos/i18n";
import * as notificationMgr from "@zos/notification";
import * as appServiceMgr from "@zos/app-service";
import { Time } from "@zos/sensor";
import { log } from "@zos/utils";
import { BasePage } from "@zeppos/zml/base-page";

const moduleName = "Weather App Service";
const timeSensor = new Time();

const logger = log.getLogger("weather_service");
let globalData = getApp()._options.globalData;

function GetTextID() {
  let textID = {
    element_text_id_UVI: getText("element_text_id_UVI"),
    element_text_id_windSpeed: getText("element_text_id_windSpeed"),
    element_text_id_windGusts: getText("element_text_id_windGusts"),
    element_text_id_humidity: getText("element_text_id_humidity"),
    element_text_id_pressure: getText("element_text_id_pressure"),
    element_text_id_cloudiness: getText("element_text_id_cloudiness"),
    element_text_id_visibility: getText("element_text_id_visibility"),
    element_text_id_chanceOfRain: getText("element_text_id_chanceOfRain"),
    element_text_id_rainfall: getText("element_text_id_rainfall"),
  };
  return textID;
}

// function sendNotification(title = "", text = "") {
//   logger.log("send notification");
//   notificationMgr.notify({
//     title: title,
//     content: text,
//     actions: [
//       // {
//       //   text: "Home Page",
//       //   file: "pages/index",
//       // },
//       // {
//       //   text: "Stop Service",
//       //   file: "app-service/time_service",
//       //   param: "action=exit", //! processed in onEvent()
//       // },
//     ],
//   });
// }

function updateWeather (type, context) {
  logger.log(`updateWeather(${type})`);
  if (type == "weather" && globalData.weatherJson) {
    if (isFinite(globalData.weatherJson.weatherTime)) {
      const weatherTime = new Date(globalData.weatherJson.weatherTime);
      const naw = new Date();
      let diffTime = parseInt((naw - weatherTime) / ( 60 * 1000)); // minute
      // logger.log(`weatherTime = ${weatherTime.toString()}`);
      // logger.log(`naw = ${naw.toString()}`);
      logger.log(`diffTime = ${diffTime}`);
      if (diffTime < 60-1) return;
    }
  }
  if (type == "forecast" && globalData.forecastJson) {
    if (isFinite(globalData.forecastJson.weatherTime)) {
      const weatherTime = new Date(globalData.forecastJson.weatherTime);
      const naw = new Date();
      let diffTime = parseInt((naw - weatherTime)  / ( 60 * 1000)); // minute
      // logger.log(`weatherTime = ${weatherTime.toString()}`);
      // logger.log(`naw = ${naw.toString()}`);
      logger.log(`diffTime = ${diffTime}`);
      if (diffTime < 3*60) return;
    }
  }
  // const context = getCurrentPage();
  context.getDataFromNetwork(type);
}

AppService(
  BasePage({
    onEvent() {
      logger.log(`service onEvent(${e})`);
      if (e != undefined && e != "undefined") {
        let result = JSON.parse(e);
        if (result.action === "exit") {
          logger.log(`result.action = exit`);
          appServiceMgr.exit();
        }
      }
    },

    onInit(e) {
      logger.log(`service onInit(${e})`);

      timeSensor.onPerMinute(() => {
        logger.log(`${moduleName} time report: ${timeSensor.getHours()}:${timeSensor.getMinutes()}:${timeSensor.getSeconds()}`);
        let minute = timeSensor.getMinutes();
        if (minute % 10 == 1) updateWeather ("weather", this);
        if (minute % 10 == 3) updateWeather ("forecast", this);
      });
      
      logger.log(`${moduleName} timeSensor start report: ${timeSensor.getHours()}:${timeSensor.getMinutes()}:${timeSensor.getSeconds()}`);

      // this.getDataFromNetwork('weather');
    },
    onDestroy() {
      logger.log("service on destroy invoke");
    },

    getDataFromNetwork(type) {
      logger.log(`getDataFromNetwork(${type})`);
      let textID = GetTextID();
      let urlByGeo = "";
      if (type == "weather") urlByGeo = globalData.urlByGeoWeather;
      if (type == "forecast") urlByGeo = globalData.urlByGeoForecast;

      logger.log(`urlByGeo = ${urlByGeo}`);
      if (urlByGeo == undefined || urlByGeo == null || urlByGeo.length == 0) {
        logger.log(`no coordinate`);
        return;
      }
      let globalDataTemp = {
        city_name: globalData.city_name,
        district: globalData.district,
        timeZone: globalData.timeZone
      }
      this.request({
        method: "GET",
        url: urlByGeo,
        type: type,
        site: globalData.site,
        textID: textID,
        globalData: globalDataTemp,
      })
        .then((result) => {
          logger.log("receive data");
          const { status, data } = result;
          if (status != "success") {
            logger.log("error data");
            return;
          }

          logger.log(`JSON data = ${JSON.stringify(data)}`);
          if (type == "weather") {
            if (data != undefined && data != null) {
              globalData.weatherJson = data;
              globalData.weatherFile.set(globalData.weatherJson);
              // sendNotification(getText("weather_update"), JSON.stringify(data));
            }
          }
          if (type == "forecast") {
            if (data != undefined && data != null) {
              globalData.forecastJson = data;
              globalData.forecastFile.set(globalData.forecastJson);
              if (globalData.site == "AccuWeather_API" && globalData.forecastJson != undefined && globalData.forecastJson.forecast != undefined && 
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
            }
          }
          logger.log("file save");
        })
        .catch((error) => {
          logger.error("error=>", error);
        });
    },
  })
);
