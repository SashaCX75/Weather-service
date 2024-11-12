import { getText } from '@zos/i18n'
import { BasePage } from '@zeppos/zml/base-page'
import { createWidget, widget, prop, align, text_style, event } from '@zos/ui'
import { setStatusBarVisible, redraw  } from '@zos/ui'
import { showToast } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log, px } from '@zos/utils'
import { push, back} from '@zos/router'
import { setPageBrightTime, resetPageBrightTime } from '@zos/display'
import { Time, TIME_HOUR_FORMAT_12 } from '@zos/sensor'
import { getDateFormat, DATE_FORMAT_YMD, DATE_FORMAT_DMY, DATE_FORMAT_MDY } from '@zos/settings'
import { BTN_BACK } from 'zosLoader:./index.[pf].layout.js'

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT  } = getDeviceInfo();
const logger = log.getLogger("Weather_Forecast.info");
const time = new Time();
setStatusBarVisible(false);

let globalData = getApp()._options.globalData;
let weatherJson = globalData.weatherJson;
let storage = globalData.storage;

let notif_temperature;
let notif_feelslike;
let notif_wind;
let notif_cloudiness;
let notif_pressure;
let notif_humidity
let notif_rain;
let notif_chanceOfRain;
let notif_visibility;
let notif_uvi;
let notif_sunrise;
let notif_sunset;
let notif_moonrise;
let notif_moonset;
let notif_timezone;

//#region functions

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
  notif_temperature.updateValue(temperatureStr);
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
      pressureStr = pressure + 'mmHg';
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

function DistanceUnit () {
  let distance_unit = storage.getKey("distance_unit", 1);
  distance_unit = ++distance_unit % 3;
  storage.setKey("distance_unit", distance_unit);

  let visibilityStr = "--";
  if (isFinite(weatherJson.visibility)) {
    let distance_unit = storage.getKey("distance_unit", 1); 
    if (distance_unit == 0) {
      visibilityStr = weatherJson.visibility  + getText('meter');
    }
    else if (distance_unit == 1) {
      visibilityStr = parseFloat(weatherJson.visibility / 1000).toFixed(1)  + getText('km');
    }
    else if (distance_unit == 2) {
      visibilityStr = parseFloat(weatherJson.visibility / 1609.344).toFixed(1)  + getText('mile');
    }
  }
  notif_visibility.updateValue(visibilityStr);
}


function CelsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9 / 5) + 32);
}

function HpaToMmHg(hpa) {
  return Math.round(hpa * 0.75006168271);
}

function GetCloudiness() {
  logger.log(`GetCloudiness`);
  let cloudiness_index = 0;
  if (weatherJson.cloudiness != undefined && weatherJson.cloudiness != null) {
    let cloudiness = weatherJson.cloudiness;
    if (cloudiness > 11 && cloudiness <= 40) cloudiness_index = 1;
    if (cloudiness > 40 && cloudiness <= 70) cloudiness_index = 2;
    if (cloudiness > 70) cloudiness_index = 3;
    logger.log(`cloudiness = ${cloudiness}, cloudiness_index = ${cloudiness_index}`);
  }
  return cloudiness_index;
}

//#endregion



class Notif {
  constructor(x, y, text, value, src, func, layout) {
    this.posX = -1;
    this.posY = -1;
    let group;
    if (layout == undefined || layout == null) {
      group = createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(175),
        h: px(95),
      });
    }
    else {
      group = layout.createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(175),
        h: px(95),
      });
    }

    this.fiil_rect = group.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(175),
      h: px(60),
      radius: px(20),
      color: 0x353535
    });

    this.img = group.createWidget(widget.IMG, {
      x: px(6),
      y: px(6),
      src: src,
    });
    this.img.setEnable(false);

    this.value = group.createWidget(widget.TEXT, {
      x: px(55),
      y: 0,
      w: px(120),
      h: px(40),
      text_size: px(24),
      color: 0xffffff,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: value,
    });
    this.value.setEnable(false);

    this.text = group.createWidget(widget.TEXT, {
      x: px(55),
      y: px(35),
      w: px(120),
      h: px(20),
      text_size: px(16),
      color: 0xffffff,
      align_h: align.LEFT,
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
}

class Card {
  constructor(x, y, dow_index, date, bg_img, icon, temperature, weather, cloudiness, chanceOfRain, wind, windAngle, layout) {
    // logger.log(`Card constructor`);
    let group;
    if (layout == undefined || layout == null) {
      group = createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(400),
        h: px(190),
      });
    }
    else {
      group = layout.createWidget(widget.GROUP, {
        x: x,
        y: y,
        w: px(400),
        h: px(190),
      });
    }

    this.fiil_rect = group.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(110),
      h: px(190),
      radius: px(35),
      color: 0x353535
    });

    this.img = group.createWidget(widget.IMG, {
      x: px(75),
      y: 0,
      src: bg_img,
    });

    // if (day_night) {
    //   this.mask = group.createWidget(widget.FILL_RECT, {
    //     x: px(75),
    //     y: 0,
    //     w: px(325),
    //     h: px(190),
    //     color: 0x000000,
    //   });
    //   this.mask.setAlpha(75);
    // } 

    let dayStr = getText(`day_of_week_${dow_index}`);
    logger.log(`dow_index = ${dow_index}, dayStr = ${dayStr}`);
    let color = 0xffffff;
    if (dow_index == 0 || dow_index == 6) color = 0xff0000;
    this.dow = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(60),
      w: px(75),
      h: px(30),
      text_size: px(24),
      color: color,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: dayStr,
    });

    this.date = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(90),
      w: px(75),
      h: px(30),
      text_size: px(24),
      color: 0xffce9c,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: date,
    });

    this.icon = group.createWidget(widget.IMG, {
      x: px(90),
      y: 0,
      src: icon,
    });

    this.temperature_shadow = group.createWidget(widget.TEXT, {
      x: px(75)+2,
      y: px(80)+2,
      w: px(125),
      h: px(30),
      text_size: px(24),
      color: 0x000000,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: temperature,
    });
    this.temperature = group.createWidget(widget.TEXT, {
      x: px(75),
      y: px(80),
      w: px(125),
      h: px(30),
      text_size: px(24),
      color: 0x00efff,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: temperature,
    });

    // group.createWidget(widget.FILL_RECT, {
    //   x: px(200),
    //   y: px(20),
    //   w: px(190),
    //   h: px(100),
    //   color: 0xff0000,
    // });
    this.weather_shadow = group.createWidget(widget.TEXT, {
      x: px(190)+2,
      y: px(10)+2,
      w: px(210),
      h: px(100),
      line_space: px(-20),
      text_size: px(24),
      color: 0x000000,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: weather,
    });
    this.weather = group.createWidget(widget.TEXT, {
      x: px(190),
      y: px(10),
      w: px(210),
      h: px(100),
      line_space: px(-20),
      text_size: px(24),
      color: 0xffce9c,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: weather,
    });

    this.cloudiness_icon = group.createWidget(widget.IMG, {
      x: px(82),
      y: px(155),
      src: cloudiness > 50 ? "card/icon_cloudiness_1.png" : "card/icon_cloudiness_0.png",
    });
    this.cloudiness_shadow = group.createWidget(widget.TEXT, {
      x: px(120)+2,
      y: px(155)+2,
      w: px(100),
      h: px(30),
      text_size: px(24),
      color: 0x000000,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: cloudiness + "%",
    });
    this.cloudiness = group.createWidget(widget.TEXT, {
      x: px(120),
      y: px(155),
      w: px(100),
      h: px(30),
      text_size: px(24),
      color: 0xffffff,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: cloudiness + "%",
    });

    this.chanceOfRain_icon = group.createWidget(widget.IMG, {
      x: px(242),
      y: px(155),
      src: chanceOfRain > 50 ? "card/icon_chanceOfRain_1.png" : "card/icon_chanceOfRain_0.png",
    });
    this.chanceOfRain_shadow = group.createWidget(widget.TEXT, {
      x: px(280)+2,
      y: px(155)+2,
      w: px(100),
      h: px(30),
      text_size: px(24),
      color: 0x000000,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: chanceOfRain + "%",
    });
    this.chanceOfRain = group.createWidget(widget.TEXT, {
      x: px(280),
      y: px(155),
      w: px(100),
      h: px(30),
      text_size: px(24),
      color: 0xffffff,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: chanceOfRain + "%",
    });

    // this.wind = group.createWidget(widget.TEXT, {
    //   x: px(280),
    //   y: px(125),
    //   w: px(100),
    //   h: px(30),
    //   text_size: px(24),
    //   color: 0xffffff,
    //   align_h: align.LEFT,
    //   align_v: align.CENTER_V,
    //   text_style: text_style.NONE,
    //   text: wind,
    // });
    // this.wind_pointer = group.createWidget(widget.IMG, {
    //   x: px(242),
    //   y: px(125),
    //   center_x: px(15),
    //   center_y: px(15),
    //   angle: windAngle,
    //   src: "weather_img/wind_dir_pointer.png",
    // });

    // this.sun_rise_icon = group.createWidget(widget.IMG, {
    //   x: px(80),
    //   y: px(155),
    //   src: "card/icon_sunrise.png",
    // });
    // this.sunriseTime = group.createWidget(widget.TEXT, {
    //   x: px(120),
    //   y: px(155),
    //   w: px(100),
    //   h: px(40),
    //   text_size: px(24),
    //   color: 0xffffff,
    //   align_h: align.LEFT,
    //   align_v: align.CENTER_V,
    //   text_style: text_style.NONE,
    //   text: sun_rise,
    // });
    
    // this.sun_rise_icon = group.createWidget(widget.IMG, {
    //   x: px(240),
    //   y: px(155),
    //   src: "card/icon_sunset.png",
    // });
    // this.sun_set = group.createWidget(widget.TEXT, {
    //   x: px(280),
    //   y: px(155),
    //   w: px(100),
    //   h: px(40),
    //   text_size: px(24),
    //   color: 0xffffff,
    //   align_h: align.LEFT,
    //   align_v: align.CENTER_V,
    //   text_style: text_style.NONE,
    //   text: sun_set,
    // });

    this.wind_icon = group.createWidget(widget.IMG, {
      x: px(150),
      y: px(125),
      src: "card/icon_wind.png",
    });
    this.wind_shadow = group.createWidget(widget.TEXT, {
      x: px(185)+2,
      y: px(125)+2,
      w: px(150),
      h: px(35),
      text_size: px(24),
      color: 0x000000,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: wind,
    });
    this.wind = group.createWidget(widget.TEXT, {
      x: px(185),
      y: px(125),
      w: px(150),
      h: px(35),
      text_size: px(24),
      color: 0xffffff,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: wind,
    });
    this.wind_direction = group.createWidget(widget.IMG, {
      x: px(190),
      y: px(155),
      w: px(30),
      h: px(30),
      // pos_x: 0,
      // pos_y: 0,
      center_x: px(15),
      center_y: px(15),
      angle: windAngle,
      src: "weather_img/wind_dir_pointer.png",
    });

  }
}

Page(BasePage({
  build() {
    logger.log(`build`);

    setPageBrightTime({ brightTime: 60000 })

    //#region strings
    let cityStr = "--";
    let temperatureStr = "--";
    let feelslikeStr = "--";
    let windStr = "--";
    let windAngle = 0;
    let cloudinessStr = "--";
    let pressureStr = "--";
    let humidityStr = "--";
    let rainStr = "0" + getText('mm');
    let chanceOfRainStr = "--";
    let visibilityStr = "--";
    let uviStr = "--";
    let sunriseStr = "--:--";
    let sunsetStr = "--:--";
    let moonriseStr = "--:--";
    let moonsetStr = "--:--";
    let timezoneStr = "--:--";
    let timeStr = "";
    
    let chanceOfRainSrc = "weather_img/notif_chanceOfRain_0.png";
    if (weatherJson != undefined && weatherJson != null) {
      
      if (weatherJson.city != undefined && weatherJson.city != null && weatherJson.city.length > 0) {
        cityStr = weatherJson.city;
        cityStr = cityStr.replace(cityStr[0], cityStr[0].toUpperCase());
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
      // logger.log(`humidity = ${weatherJson.humidity}`);
      if (isFinite(weatherJson.humidity)) {
        humidityStr = weatherJson.humidity + '%';
      }
      if (isFinite(weatherJson.rainfall)) {
        rainStr = parseFloat(weatherJson.rainfall).toFixed(1) + getText('mm');
      }
      if (isFinite(weatherJson.chanceOfRain)) {
        chanceOfRainStr = weatherJson.chanceOfRain + '%';
        if (weatherJson.chanceOfRain > 50) chanceOfRainSrc = `weather_img/notif_chanceOfRain_1.png`;
      }
      if (isFinite(weatherJson.visibility)) {
        let distance_unit = storage.getKey("distance_unit", 1); 
        if (distance_unit == 0) {
          visibilityStr = weatherJson.visibility  + getText('meter');
        }
        else if (distance_unit == 1) {
          visibilityStr = parseFloat(weatherJson.visibility / 1000).toFixed(1)  + getText('km');
        }
        else if (distance_unit == 2) {
          visibilityStr = parseFloat(weatherJson.visibility / 1609.344).toFixed(1)  + getText('mile');
        }
      }
      if (isFinite(weatherJson.uvi)) {
        uviStr = weatherJson.uvi;
      }
      // logger.log(`windSpeed = ${weatherJson.windSpeed}`);
      // logger.log(`windGusts = ${weatherJson.windGusts}`);
      if (isFinite(weatherJson.windSpeed)) {
        let wind_unit = storage.getKey("wind_unit", 0);
        let wind = weatherJson.windSpeed;
        if (wind_unit == 1) {
          wind = parseFloat(wind * 3.6).toFixed(1);
          windStr = wind + getText('kph');
          // windStr = wind + ' kph';
        }
        else if (wind_unit == 2) {
          wind = parseFloat(wind * 2.23694).toFixed(1);
          windStr = wind + getText('mph');
          // windStr = wind + ' mph';
        }
        else {
          wind = parseFloat(wind).toFixed(1);
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
          pressureStr = pressure + 'mmHg';
        }
        else pressureStr = pressure + ' hPa';
      }
      // logger.log(`cloudiness = ${weatherJson.cloudiness}`);
      if (isFinite(weatherJson.cloudiness)) {
        cloudinessStr = weatherJson.cloudiness + '%';
      }

      if (isFinite(weatherJson.sunriseTime)) {
        const sunrise = new Date(weatherJson.sunriseTime);
        let hour = sunrise.getHours();
        let minute = sunrise.getMinutes();
        if (time.getHourFormat() == TIME_HOUR_FORMAT_12) {
          let am_pm = 'AM';
          if (hour >= 12) {
            hour -= 12;
            am_pm = 'PM';
          }
          if (hour == 0) {
            hour = 12;
          }
          sunriseStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0') + ' ' + am_pm;
        }
        else sunriseStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0');
        // sunriseStr = sunrise.getHours().toString().padStart(2, '0') + ':' + sunrise.getMinutes().toString().padStart(2, '0');
      }
      if (isFinite(weatherJson.sunsetTime)) {
        const sunset = new Date(weatherJson.sunsetTime);
        // logger.log(`sunset --= ${sunset.toString()}`);let hour = sunset.getHours();
        let hour = sunset.getHours();
        let minute = sunset.getMinutes();
        if (time.getHourFormat() == TIME_HOUR_FORMAT_12) {
          let am_pm = 'AM';
          if (hour >= 12) {
            hour -= 12;
            am_pm = 'PM';
          }
          if (hour == 0) {
            hour = 12;
          }
          sunsetStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0') + ' ' + am_pm;
        }
        else sunsetStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0');
        // sunsetStr = sunset.getHours().toString().padStart(2, '0') + ':' + sunset.getMinutes().toString().padStart(2, '0');
      }
      if (isFinite(weatherJson.moonriseTime)) {
        const moonrise = new Date(weatherJson.moonriseTime);
        let hour = moonrise.getHours();
        let minute = moonrise.getMinutes();
        if (time.getHourFormat() == TIME_HOUR_FORMAT_12) {
          let am_pm = 'AM';
          if (hour >= 12) {
            hour -= 12;
            am_pm = 'PM';
          }
          if (hour == 0) {
            hour = 12;
          }
          moonriseStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0') + ' ' + am_pm;
        }
        else moonriseStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0');
        // moonriseStr = moonrise.getHours().toString().padStart(2, '0') + ':' + moonrise.getMinutes().toString().padStart(2, '0');
      }
      if (isFinite(weatherJson.moonsetTime)) {
        const moonset = new Date(weatherJson.moonsetTime);
        let hour = moonset.getHours();
        let minute = moonset.getMinutes();
        if (time.getHourFormat() == TIME_HOUR_FORMAT_12) {
          let am_pm = 'AM';
          if (hour >= 12) {
            hour -= 12;
            am_pm = 'PM';
          }
          if (hour == 0) {
            hour = 12;
          }
          moonsetStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0') + ' ' + am_pm;
        }
        else moonsetStr = hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0');
        // moonsetStr = moonset.getHours().toString().padStart(2, '0') + ':' + moonset.getMinutes().toString().padStart(2, '0');
      }
      
      // logger.log(`timeZone = ${weatherJson.timeZone}`);
      if (isFinite(weatherJson.timeZone)) {
        const timeZone = weatherJson.timeZone;
        timezoneStr = parseInt(Math.abs(timeZone / 60)).toString().padStart(2, '0') + ':' + (timeZone % 60).toString().padStart(2, '0');
        if (timeZone < 0) timezoneStr = '-' + timezoneStr;
        else timezoneStr = '+' + timezoneStr;
      }

      if (isFinite(globalData.forecastJson.weatherTime)) {
        const weatherTime = new Date(globalData.forecastJson.weatherTime);
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
    }

    let cloudiness_index = GetCloudiness();
    let cloudinessSrc = 'weather_img/notif_cloudiness_0.png';
    if (cloudiness_index > 0) cloudinessSrc = 'weather_img/notif_cloudiness_' + cloudiness_index + '.png';

    let rainSrc = 'weather_img/notif_rain_0.png';
    if (isFinite(weatherJson.rainfall)) {
      if (weatherJson.rainfall > 0) rainSrc = 'weather_img/notif_rain_1.png';
    }

    logger.log(`cloudinessSrc = ${cloudinessSrc}`);
    //#endregion

    const viewContainer = createWidget(widget.VIEW_CONTAINER, {
      x: 0,
      y: px(70),
      w: DEVICE_WIDTH,
      h: DEVICE_HEIGHT - px(125),
    });

    createWidget(widget.TEXT, {
      x: (DEVICE_WIDTH - px(210)) / 2,
      y: px(25),
      w: px(210),
      h: px(35),
      color: 0xffffff,
      text_size: px(24),
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: cityStr,
    });

    //#region notifs
    notif_temperature = new Notif(px(55), 0, getText("temperature"), temperatureStr, 'weather_img/notif_temperature.png', TemperatureUnit, viewContainer);
    notif_feelslike = new Notif(DEVICE_WIDTH/2 + px(10), 0, getText("feels"), feelslikeStr, 'weather_img/notif_temperature.png', TemperatureUnit, viewContainer);
    
    notif_wind = new Notif(px(55), px(80), getText("wind"), windStr, 'weather_img/notif_wind.png', WindUnit, viewContainer);
    notif_cloudiness = new Notif(DEVICE_WIDTH/2 + px(15), px(80), getText("cloudiness"), cloudinessStr, cloudinessSrc, undefined, viewContainer);

    notif_pressure = new Notif(px(55), px(2*80), getText("pressure"), pressureStr, 'weather_img/notif_pressure.png', PressureUnit, viewContainer);
    notif_humidity = new Notif(DEVICE_WIDTH/2 + px(10), px(2*80), getText("humidity"), humidityStr, 'weather_img/notif_humidity.png', undefined, viewContainer);

    notif_rain = new Notif(px(55), px(3*80), getText("rain"), rainStr, rainSrc, PressureUnit, viewContainer);
    notif_chanceOfRain = new Notif(DEVICE_WIDTH/2 + px(10), px(3*80), getText("chanceOfRain"), chanceOfRainStr, chanceOfRainSrc, undefined, viewContainer);

    notif_visibility = new Notif(px(55), px(4*80), getText("visibility"), visibilityStr, 'weather_img/notif_visibility.png', DistanceUnit, viewContainer);
    notif_uvi = new Notif(DEVICE_WIDTH/2 + px(10), px(4*80), getText("UVI"), uviStr, 'weather_img/notif_uvindex.png', undefined, viewContainer);

    notif_sunrise = new Notif(px(55), px(5*80), getText("rise"), sunriseStr, 'weather_img/notif_sun.png', PressureUnit, viewContainer);
    notif_sunset = new Notif(DEVICE_WIDTH/2 + px(10), px(5*80), getText("set"), sunsetStr, 'weather_img/notif_sun.png', undefined, viewContainer);

    notif_moonrise = new Notif(px(55), px(6*80), getText("rise"), moonriseStr, 'weather_img/notif_moon.png', PressureUnit, viewContainer);
    notif_moonset = new Notif(DEVICE_WIDTH/2 + px(10), px(6*80), getText("set"), moonsetStr, 'weather_img/notif_moon.png', undefined, viewContainer);
    
    notif_timezone = new Notif(DEVICE_WIDTH/2 + px(10), px(7*80), getText("timezone"), timezoneStr, 'weather_img/notif_timezone.png', undefined, viewContainer);

    //#endregion

    //#region cards

    setTimeout(() => { 
      logger.log(`setTimeout()`);
      let card_offset = px(650);
      // let card_offset = 0;
      let count = 0;
      if (globalData && globalData.forecastJson && globalData.forecastJson.forecast) {
        globalData.forecastJson.forecast.forEach(forecast_element => {
          // logger.log(`forecast_element = ${JSON.stringify(forecast_element)}`);
          logger.log(`forecast_element count = ${count}`);

          //#region strings
          let dow_index = 0;
          let dateStr = "--";
          let bg_img = 'card/bg_0.png';
          let icon = 'card/icon_0.png';
          let weatherDescriptionStr = "--";
          let tempMinStr = "--";
          let tempMaxStr = "--";
          let cloudinessValue = "--";
          let chanceOfRainValue = "--";
          // let sunriseStr = "--:--";
          // let sunsetStr = "--:--";
          let windStr = "--";
          let windAngle = 0;
            
          if (isFinite(forecast_element.weatherTime)) {
            const weatherTime = new Date(forecast_element.weatherTime);
            // logger.log(`weatherTime = ${weatherTime}`);
            // // dayStr = getText(`day_of_week_${weatherTime.getDay()}`);
            // timeStr = weatherTime.getDate() + ' ' +  weatherTime.getMonth();
            dow_index = weatherTime.getDay();
            const currentDateFormat = getDateFormat();
            if (currentDateFormat === DATE_FORMAT_DMY) {
              dateStr = weatherTime.getDate() + '.' + (weatherTime.getMonth()+1).toString();
            }
            else if (currentDateFormat === DATE_FORMAT_YMD || currentDateFormat === DATE_FORMAT_MDY) {
              dateStr = (weatherTime.getMonth()+1).toString() + '/' + weatherTime.getDate();
            }

          }

          if (isFinite(forecast_element.weatherIcon)) {
            icon_index = parseInt(forecast_element.weatherIcon);
            let iconSrc = `_${icon_index}`;
            bg_img = `card/bg${iconSrc}.png`;
            if (icon_index == 5 || icon_index == 9) {
              if (forecast_element.cloudiness > 50) iconSrc += 'c';
            }
            // bg_img = `card/bg${iconSrc}.png`;
            icon = `card/icon${iconSrc}.png`;
          }

          if (forecast_element.weatherDescriptionExtended != undefined && forecast_element.weatherDescriptionExtended != null && forecast_element.weatherDescriptionExtended.length > 0) {
            weatherDescriptionStr = forecast_element.weatherDescriptionExtended;
            weatherDescriptionStr = weatherDescriptionStr.replace(weatherDescriptionStr[0], weatherDescriptionStr[0].toUpperCase());
          }

          // logger.log(`temperature = ${forecast_element.temperature}`);
          if (isFinite(forecast_element.temperatureMin)) {
            let temperature_unit = storage.getKey("temperature_unit", 0);
            let temperature = parseFloat(forecast_element.temperatureMin).toFixed(0);
            if (temperature_unit == 1) {
              temperature = CelsiusToFahrenheit(temperature);
              tempMinStr = temperature + '°';
            }
            else tempMinStr = temperature + '°';
            if (temperature > 0) tempMinStr = '+' + tempMinStr;
            // else if (temperature < 0) tempMinStr = '-' + tempMinStr;
          }
          if (isFinite(forecast_element.temperatureMax)) {
            let temperature_unit = storage.getKey("temperature_unit", 0);
            let temperature = parseFloat(forecast_element.temperatureMax).toFixed(0);
            if (temperature_unit == 1) {
              temperature = CelsiusToFahrenheit(temperature);
              tempMaxStr = temperature + '°';
            }
            else tempMaxStr = temperature + '°';
            if (temperature > 0) tempMaxStr = '+' + tempMaxStr;
            // else if (temperature < 0) tempMaxStr = '-' + tempMaxStr;
          }
          
          // if (isFinite(forecast_element.humidity)) {
          //   humidityStr = forecast_element.humidity + '%';
          // }
          // if (isFinite(forecast_element.rainfall)) {
          //   rainStr = forecast_element.rainfall + ' mm';
          // }

          if (isFinite(forecast_element.cloudiness)) {
            cloudinessValue = parseInt(forecast_element.cloudiness);
          }
          logger.log(`forecast_element.chanceOfRain = ${forecast_element.chanceOfRain}`);
          if (isFinite(forecast_element.chanceOfRain)) {
            chanceOfRainValue = parseInt(forecast_element.chanceOfRain);
          }

          // if (isFinite(forecast_element.visibility)) {
          //   let distance_unit = storage.getKey("distance_unit", 1); 
          //   if (distance_unit == 0) {
          //     visibilityStr = forecast_element.visibility  + getText('meter');
          //   }
          //   else if (distance_unit == 1) {
          //     visibilityStr = parseFloat(forecast_element.visibility / 1000).toFixed(1)  + getText('km');
          //   }
          //   else if (distance_unit == 2) {
          //     visibilityStr = parseFloat(forecast_element.visibility / 1609.344).toFixed(1)  + getText('mile');
          //   }
          // }
          // if (isFinite(forecast_element.uvi)) {
          //   uviStr = forecast_element.uvi;
          // }
          
          
          if (isFinite(forecast_element.windSpeed)) {
            let wind_unit = storage.getKey("wind_unit", 0);
            let wind = forecast_element.windSpeed;
            if (wind_unit == 1) {
              wind = parseFloat(wind * 3.6).toFixed(1);
              windStr = wind + getText('kph');
              // windStr = wind + ' kph';
            }
            else if (wind_unit == 2) {
              wind = parseFloat(wind * 2.23694).toFixed(1);
              windStr = wind + getText('mph');
              // windStr = wind + ' mph';
            }
            else {
              wind = parseFloat(wind).toFixed(1);
              windStr = wind + getText('m_s');
              // windStr = wind + ' m/s';
            }
          }
          if (isFinite(forecast_element.windDirection)) {
            windAngle = forecast_element.windDirection;
          }
          
          // if (isFinite(forecast_element.pressure)) {
          //   let pressure_unit = storage.getKey("pressure_unit", 0);
          //   let pressure = forecast_element.pressure;
          //   if (pressure_unit == 1) {
          //     pressure = HpaToMmHg(pressure);
          //     // pressureStr = pressure + getText('mmHg');
          //     pressureStr = pressure + ' mmHg';
          //   }
          //   else pressureStr = pressure + ' hPa';
          // }

          // logger.log(`cloudiness = ${forecast_element.cloudiness}`);
          if (isFinite(forecast_element.cloudiness)) {
            cloudinessValue = parseInt(forecast_element.cloudiness);
          }
          
          // if (isFinite(forecast_element.sunriseTime)) {
          //   const sunrise = new Date(forecast_element.sunriseTime);
          //   let hour = sunrise.getHours();
          //   let minute = sunrise.getMinutes();
          //   if (time.getHourFormat() == TIME_HOUR_FORMAT_12) {
          //     let am_pm = 'AM';
          //     if (hour >= 12) {
          //       hour -= 12;
          //       am_pm = 'PM';
          //     }
          //     if (hour == 0) {
          //       hour = 12;
          //     }
          //     sunriseStr += hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0') + ' ' + am_pm;
          //   }
          //   else sunriseStr += hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0');
          //   // sunriseStr = sunrise.getHours().toString().padStart(2, '0') + ':' + sunrise.getMinutes().toString().padStart(2, '0');
          // }
          // if (isFinite(forecast_element.sunsetTime)) {
          //   const sunset = new Date(forecast_element.sunsetTime);
          //   let hour = sunset.getHours();
          //   let minute = sunset.getMinutes();
          //   if (time.getHourFormat() == TIME_HOUR_FORMAT_12) {
          //     let am_pm = 'AM';
          //     if (hour >= 12) {
          //       hour -= 12;
          //       am_pm = 'PM';
          //     }
          //     if (hour == 0) {
          //       hour = 12;
          //     }
          //     sunsetStr += hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0') + ' ' + am_pm;
          //   }
          //   else sunsetStr += hour.toString().padStart(2, '0')  + ':' + minute.toString().padStart(2, '0');
          //   // sunsetStr = sunset.getHours().toString().padStart(2, '0') + ':' + sunset.getMinutes().toString().padStart(2, '0');
          // }
          //#endregion
          
          new Card(
            (DEVICE_WIDTH - px(400)) / 2,
            card_offset + count * px(210),
            dow_index,
            dateStr,
            bg_img,
            icon,
            tempMinStr + '...' + tempMaxStr,
            weatherDescriptionStr,
            cloudinessValue,
            chanceOfRainValue,
            // sunriseStr, 
            // sunsetStr, 
            windStr,
            windAngle,
            viewContainer
          );
          count++;
          
        });

        // viewContainer.createWidget(widget.FILL_RECT, {
        //   x: 0,
        //   y: card_offset + count * px(210),
        //   w: DEVICE_WIDTH,
        //   h: px(50),
        //   color: 0x000000
        // });

        viewContainer.createWidget(widget.TEXT, {
          x: 0,
          y: card_offset + count * px(210),
          w: DEVICE_WIDTH,
          h: px(30),
          color: 0xffffff,
          text_size: px(20),
          align_h: align.CENTER_H,
          align_v: align.TOP,
          text_style: text_style.NONE,
          text: timeStr
        });
      }
    }, 500)
    
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

  },
    
  onDestroy() {
    logger.log("page onDestroy invoked");
    resetPageBrightTime();
  },


}))
