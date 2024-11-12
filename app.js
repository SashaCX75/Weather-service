import { BaseApp } from '@zeppos/zml/base-app';
import EasyStorage from "@silver-zepp/easy-storage";
import LocalStorageFile from "./utils/storage";

App(BaseApp({
  globalData: {
		urlByGeoWeather: '',
		urlByGeoForecast: '',
		latitude: 0,
		longitude: 0,
    storage: null,
    weatherJson: null,
    weatherFile: null,
    forecastJson: null,
    forecastFile: null,
    site: 'AccuWeather',
    OpenWeather_APIkey: 'fc95cd22842af9f54cf6ba3ec231c9c7',
    AccuWeather_APIkey: '',
    units: 'metric',
    lang: 'ru',
  },
  onCreate(options) {
    // console.log('app on create invoke');
    console.log(`App onCreate(${options})`)
    let storage = new EasyStorage();
    storage.SetAutosaveEnable(true);
    this.globalData.weatherFile = new LocalStorageFile("weather.json");
    this.globalData.forecastFile = new LocalStorageFile("forecast.json");
    this.globalData.storage = storage;
    this.globalData.latitude = storage.getKey("latitude", 0);
    this.globalData.longitude = storage.getKey("longitude", 0);
    this.globalData.site = storage.getKey("site", 'AccuWeather');
    this.globalData.urlByGeoWeather = storage.getKey("urlByGeoWeather", "");
    this.globalData.urlByGeoForecast = storage.getKey("urlByGeoForecast", "");

    this.globalData.OpenWeather_APIkey = storage.getKey("OpenWeather_APIkey", "fc95cd22842af9f54cf6ba3ec231c9c7");
    this.globalData.AccuWeather_APIkey = storage.getKey("AccuWeather_APIkey", "");

    this.globalData.city_name = storage.getKey("city_name", "");
    this.globalData.district = storage.getKey("district", "");
    this.globalData.timeZone = storage.getKey("timeZone", "");

    this.globalData.weatherJson = this.globalData.weatherFile.get();
    this.globalData.forecastJson = this.globalData.forecastFile.get();
  },

  onDestroy(options) {
    console.log('app on destroy invoke')
  }
}))