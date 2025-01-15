import { BaseSideService } from "@zeppos/zml/base-side";
// const logger = Logger.getLogger("*****message-app-side");
const logger = console;

async function fetchData(res, url, site, type, globalData) {
  logger.log(`app-side fetchData() url = ${url}, site = ${site}, type = ${type}`);
  try {
    const response = await fetch({
      url: url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ZeppOS/1.0)",
      },
    });

    if (response.status == 401 && site == "AccuWeather_API") {
      throw new Error(
        `Invalid API Key`
      );
    }
    if (response.status == 503 && site == "AccuWeather_API") {
      throw new Error(
        `The allowed number of requests has been exceeded. Status code: ${response.status}`
      );
    }
    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch weather page, status code: ${response.status}`
      );
    }
    // logger.log(`app-side response.status = ${response.status}`);
    // logger.log(`app-side response.body = ${response.body}`);

    // logger.log(`app-side response.body typeof = ${typeof response.body}`);

    let weather_json;
    if (site == "OpenWeather_API") {
      if (type == "weather") weather_json = parseWeather_OpenWeather_API(response.body);
      if (type == "forecast") weather_json = parseForecast_OpenWeather_API(response.body);
    }

    if (site == "AccuWeather") {
      if (type == "weather") weather_json = parseWeather_AccuWeather(response.body);
      if (type == "forecast") weather_json = parseForecast_AccuWeather(response.body);
    }

    if (site == "AccuWeather_API") {
      if (type == "weather") weather_json = parseWeather_AccuWeather_API(response.body, globalData);
      if (type == "forecast") weather_json = parseForecast_AccuWeather_API(response.body, globalData);
    }

    let data = {};
    if (weather_json != null && weather_json != undefined) data = weather_json;
    
    let data_length = Object.keys(data).length;
    if (data_length < 3) {
      throw new Error(
        `Failed to parse weather_json; data = ${JSON.stringify(data)}`
      );
    }

    
  // logger.log(`app-side fetchData() data = ${JSON.stringify(data)}`);
    res(null, {
      status: "success",
      data: data, // Отправляем данные как JSON строку
    });
  } catch (error) {
    logger.log(`app-side fetchData ERROR = ${error}`);
    logger.log(`app-side fetchData ERROR.stringify = ${JSON.stringify(error)}`);
    res(null, {
      status: "error",
      error: `ERROR = ${error}`,
    });
  }
}

async function fetchLocation(res, url, site) {
  logger.log(`app-side fetchLocation() url = ${url},site = ${site}`);
  // logger.log(`app-side fetchLocation() type = ${type}`);
  try {
    const response = await fetch({
      url: url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ZeppOS/1.0)",
      },
    });
    logger.log(`app-side response.status = ${response.status}`);
    // logger.log(`app-side response.body = ${response.body}`);

    // logger.log(`app-side fetchLocation() response = ${JSON.stringify(response)}`);
    if (site == "AccuWeather_API" && response.status == 401) {
      throw new Error(
        `Invalid API Key`
      );
    }
    if (response.status == 503 && site == "AccuWeather_API") {
      throw new Error(
        `The allowed number of requests has been exceeded. Status code: ${response.status}`
      );
    }
    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch location link, status code: ${response.status}`
      );
    }

    let body = response.body;
    if (body == undefined || body == null) {
      throw new Error(`Failed to fetch location link, body = undefined`);
    }

    let data = {};
    if (site == "AccuWeather") {
      // body = https://www.accuweather.com/ru/gb/blackwall-tunnel/se10-0/weather-forecast/2520026
      let startIndex = body.indexOf('https://www.accuweather.com/');
      let endIndex = body.indexOf('"', startIndex);
      let url = body.substring(startIndex, endIndex);

      startIndex = url.lastIndexOf("/");
      let city_id2 = url.substring(startIndex + 1);
      logger.log(`app-side fetchLocation city_id2 = ${city_id2}`);
      url = url.substring(0, startIndex);
      // url = https://www.accuweather.com/ru/gb/blackwall-tunnel/se10-0/weather-forecast
      startIndex = url.lastIndexOf("/");
      url = url.substring(0, startIndex);
      // url = https://www.accuweather.com/ru/gb/blackwall-tunnel/se10-0
      startIndex = url.lastIndexOf("/");
      let city_id1 = url.substring(startIndex + 1);
      logger.log(`app-side fetchLocation city_id1 = ${city_id1}`);
      url = url.substring(0, startIndex);
      // url = https://www.accuweather.com/ru/gb/blackwall-tunnel
      startIndex = url.lastIndexOf("/");
      let city_name = url.substring(startIndex + 1);
      logger.log(`app-side fetchLocation city_name = ${city_name}`);

      data = {
        city_name: city_name,
        city_id1: city_id1,
        city_id2: city_id2,
      };
    }

    if (site == "AccuWeather_API") {;
      // body = http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=apikeyf&q=50.5,-0.5&language=ru
      let responseJSON = body;
      if (typeof body === 'string') responseJSON = JSON.parse(body);
      // logger.log(`app-side fetchLocation responseJSON = ${JSON.stringify(responseJSON)}`);
      data = {};
      try {
        data.city_key = responseJSON.Key;

        data.city_name = responseJSON.EnglishName;
        if (responseJSON.LocalizedName != undefined && responseJSON.LocalizedName != null && responseJSON.LocalizedName.length > 3) 
          data.city_name = responseJSON.LocalizedName;
        
        data.district = responseJSON.EnglishName;
        if (responseJSON.AdministrativeArea != undefined && responseJSON.AdministrativeArea.LocalizedName != undefined && 
          responseJSON.AdministrativeArea.LocalizedName != null && responseJSON.AdministrativeArea.LocalizedName.length > 3) 
          data.district = responseJSON.AdministrativeArea.LocalizedName;

        if (responseJSON.TimeZone != undefined ) {
          let timezoneValue = parseFloat(responseJSON.TimeZone.GmtOffset);
          let timezoneHour = parseInt(timezoneValue);
          let timezoneMin = parseInt((timezoneValue % 1) * 60 );
          // logger.log(`app-side timezoneStr = ${timezoneValue}, timezoneHour = ${timezoneHour}, timezoneMin = ${timezoneMin}`);
          data.timeZone = timezoneHour * 60 + timezoneMin;
        }
      } catch (error) {
        throw new Error(
          `AccuWeather_API parse json error: ${error}`
        );
      }
    }

    logger.log(`app-side fetchLocation data = ${JSON.stringify(data)}`);
    let data_length = Object.keys(data).length;
    if (data_length < 2) {
      throw new Error(
        `Failed to parse fetchLocation; data = ${JSON.stringify(data)}`
      );
    }

    res(null, {
      status: "success",
      data: data, // Отправляем данные как JSON строку
    });
  } catch (error) {
    logger.log(`app-side fetchLocation ERROR = ${error}`);
    res(null, {
      status: "error",
      error: `ERROR = ${error}`,
    });
  }
}

//#region functions
function decodeHtmlEntities(text) {
  return text.replace(/&#x([0-9A-Fa-f]+);/g, function (match, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

function iconFrom_OpenWeather(icon_name, id = 0) {
  let index = 0;
  let icon_index = parseInt(icon_name);
  let time_of_day = "";
  switch (icon_index) {
    case 1:
      index = 1;
      break;
      
    case 2:
      index = 2;
      break;
      
    case 3:
      index = 2;
      break;
      
    case 4:
      index = 3;
      if (id == 804) index = 4;
      break;
      
    case 9:
      index = 6;
      if (id == 300 || id == 301 || id == 302 || id == 500) {
        index = 5;
      }
      if (id == 312 || id == 313 || id == 314 || id == 321 || id == 502 || id == 503 || id == 504, id == 520 || id == 521 || id == 531) {
        index = 7;
      }
      break;
      
    case 10:
      index = 6;
      if (id == 500) {
        index = 5;
      }
      if (id == 502 || id == 503 || id == 504, id == 520 || id == 521 || id == 531) {
        index = 7;
      }
      break;
      
    case 11:
      index = 8;
      break;
      
    case 13:
      index = 10;
      if (id == 600) {
        index = 9;
      }
      if (id == 602 || id == 611 || id == 612 || id == 620 ) {
        index = 11;
      }
      if (id == 613 || id == 615 || id == 616 || id == 621 || id == 622) {
        index = 12;
      }
      break;
      
    case 50:
      index = 13;
      if (id == 731 || id == 751 || id == 771 || id == 781) {
        index = 14;
      }
      break;
  }
  switch ( icon_name.substr(-1) ){
    case "d":
      time_of_day = 'day';
      break;
        
    case "n":
      time_of_day = 'night';
      break;
  }
  return {index: index, time_of_day: time_of_day}
}

function iconFrom_AccuWeather(icon_index) {
  // logger.log(`app-side iconFrom_AccuWeather icon_index = ${icon_index}`);
  let index = 0;
  let time_of_day = "";
  switch (icon_index) {
    case 1:
      index = 1;
      time_of_day = 'day';
      break;
      
    case 2:
      index = 1;
      time_of_day = 'day';
      break;
      
    case 3:
      index = 2;
      time_of_day = 'day';
      break;
      
    case 4:
      index = 2;
      time_of_day = 'day';
      break;
      
    case 5:
      index = 3;
      time_of_day = 'day';
      break;
      
    case 6:
      index = 3;
      time_of_day = 'day';
      break;
      
    case 7:
      index = 4;
      break;
      
    case 8:
      index = 4;
      break;
      
    case 11:
      index = 13;
      break;
      
    case 12:
      index = 5;
      break;
       
    case 13:
      index = 6;
      time_of_day = 'day';
      break;
      
    case 14:
      index = 5;
      time_of_day = 'day';
      break;
       
    case 15:
      index = 8;
      break;
      
    case 16:
      index = 8;
      time_of_day = 'day';
      break;
       
    case 17:
      index = 8;
      time_of_day = 'day';
      break;
      
    case 18:
      index = 7;
      break;
       
    case 19:
      index = 9;
      break;
      
    case 20:
      index = 10;
      time_of_day = 'day';
      break;
      
    case 21:
      index = 9;
      time_of_day = 'day';
      break;
      
    case 22:
      index = 11;
      break;
      
    case 23:
      index = 10;
      time_of_day = 'day';
      break;
      
    case 24:
      index = 12;
      break;
      
    case 25:
      index = 12;
      break;

    case 26:
      index = 12;
      break;
      
    case 29:
      index = 12;
      break;
      
    case 30:
      index = 1;
      break;
      
    case 31:
      index = 1;
      break;
      
    case 32:
      index = 14;
      break;
      
    case 33:
      index = 1;
      time_of_day = 'night';
      break;
      
    case 34:
      index = 1;
      time_of_day = 'night';
      break;
      
    case 35:
      index = 2;
      time_of_day = 'night';
      break;
      
    case 36:
      index = 2;
      time_of_day = 'night';
      break;
      
    case 37:
      index = 3;
      time_of_day = 'night';
      break;
      
    case 38:
      index = 3;
      time_of_day = 'night';
      break;
      
    case 39:
      index = 5;
      time_of_day = 'night';
      break;
      
    case 40:
      index = 6;
      time_of_day = 'night';
      break;
      
    case 41:
      index = 8;
      time_of_day = 'night';
      break;
      
    case 42:
      index = 8;
      time_of_day = 'night';
      break;
      
    case 43:
      index = 9;
      time_of_day = 'night';
      break;
      
    case 44:
      index = 10;
      time_of_day = 'night';
      break;
  }
  return {index: index, time_of_day: time_of_day}
}


function windStrToAndle(str) {
  direction = 0;
  switch (str) {
    case "N":
    case "С":
    case "Пн":
      direction = 0;
      break;

    case "NNE":
    case "ССВ":
    case "Пн-Пн-Сх":
      direction = 22.5;
      break;

    case "NE":
    case "СВ":
    case "Пн-Сх":
      direction = 45;
      break;

    case "ENE":
    case "ВСВ":
    case "Сх-Пн-Сх":
      direction = 67.5;
      break;

    case "E":
    case "В":
    case "Сх":
      direction = 90;
      break;

    case "ESE":
    case "ВЮВ":
    case "Сх-Пд-Сх":
      direction = 112.5;
      break;

    case "SE":
    case "ЮВ":
    case "Пд-Сх":
      direction = 135;
      break;

    case "SSE":
    case "ЮЮВ":
    case "Пд-Пд-Сх":
      direction = 157.5;
      break;

    case "S":
    case "Ю":
    case "Пд":
      direction = 180;
      break;

    case "SSW":
    case "ЮЮЗ":
    case "Пд-Пд-Зх":
      direction = 202.5;
      break;

    case "SW":
    case "ЮЗ":
    case "Пд-Зх":
      direction = 225;
      break;

    case "WSW":
    case "ЗЮЗ":
    case "Зх-Пд-Зх":
      direction = 247.5;
      break;

    case "W":
    case "З":
    case "Зх":
      direction = 270;
      break;

    case "WNW":
    case "ЗСЗ":
    case "Зх-Пн-Зх":
      direction = 292.5;
      break;

    case "NW":
    case "СЗ":
    case "Пн-Зх":
      direction = 315;
      break;

    case "NNW":
    case "ССЗ":
    case "Пн-Пн-Зх":
      direction = 337.5;
      break;

    default:
      break;
  }
  return direction;
}

function fahrenheitToCelsius(fahrenheit) {
  return Number(parseFloat((fahrenheit - 32) * 5 / 9).toFixed(2));
}
function milesToKilometers(miles) {
  return Number(parseFloat(miles * 1.60934).toFixed(2));
}

function inchesToMillimeters(inches) {
  return Number(parseFloat(inches * 25.4).toFixed(2));
}

function inHgToHpa(inHg) {
  return Number(parseFloat(inHg * 33.86).toFixed(2));
}

function parseWeather_OpenWeather_API(weatherJSON, forecast = false) {
  // https://openweathermap.org/current#fields_json
  if (typeof weatherJSON === 'string') weatherJSON = JSON.parse(weatherJSON);
  logger.log(`app-side parseWeather_OpenWeather_API()`);
  // logger.log(`app-side weatherJSON = ${JSON.stringify(weatherJSON)}`);
  // logger.log(`app-side weatherJSON.length = ${Object.keys(weatherJSON).length}`);
  if (weatherJSON == undefined || weatherJSON == null || Object.keys(weatherJSON).length == 0) return undefined;
  let data = {};

  if (weatherJSON.weather != undefined && weatherJSON.weather.length > 0) {
    let weather = weatherJSON.weather[0];
    // logger.log(`app-side weather = ${JSON.stringify(weather)}`);
    if (weather.main != undefined) data.weatherDescription = weather.main;
    if (weather.description != undefined) data.weatherDescriptionExtended = weather.description;
    if (weather.icon != undefined) {
      let value = iconFrom_OpenWeather(weather.icon, weather.id);
      data.weatherIcon = value.index;
      data.weatherIconPeriod = value.time_of_day;
    }
  }

  if (weatherJSON.main != undefined) {
    if (weatherJSON.main.temp != undefined) {
      if (!isNaN(weatherJSON.main.temp)) data.temperature = parseFloat(weatherJSON.main.temp);
      if (!isNaN(weatherJSON.main.feels_like)) data.temperatureFeels = parseFloat(weatherJSON.main.feels_like);
      if (!isNaN(weatherJSON.main.temp_max)) data.temperatureMax = parseFloat(weatherJSON.main.temp_max);
      if (!isNaN(weatherJSON.main.temp_min)) data.temperatureMin = parseFloat(weatherJSON.main.temp_min);
      if (!isNaN(weatherJSON.main.humidity)) data.humidity = parseInt(weatherJSON.main.humidity);
      if (!isNaN(weatherJSON.main.grnd_level)) data.pressure = parseInt(weatherJSON.main.grnd_level);
    }
  }

  if (weatherJSON.wind != undefined) {
    if (!isNaN(weatherJSON.wind.speed)) data.windSpeed = parseFloat(weatherJSON.wind.speed);
    if (!isNaN(weatherJSON.wind.gust)) data.windGusts = parseFloat(weatherJSON.wind.gust);
    if (!isNaN(weatherJSON.wind.deg)) data.windDirection = Math.round(parseFloat(weatherJSON.wind.deg));
    
  }

  if (weatherJSON.clouds != undefined) {
    if (!isNaN(weatherJSON.clouds.all)) data.cloudiness = parseInt(weatherJSON.clouds.all);
  }

  if (weatherJSON.visibility != undefined) {
    if (!isNaN(weatherJSON.visibility)) data.visibility = parseInt(weatherJSON.visibility);
  }

  if (weatherJSON.snow != undefined) {
    // if (!isNaN(weatherJSON.snow["1h"])) data.snow = parseFloat(weatherJSON.snow["1h"]);
    if (!isNaN(weatherJSON.snow["1h"])) {
      let rainfall = parseFloat(weatherJSON.snow["1h"]);
      if (!isFinite(data.rainfall)) data.rainfall = rainfall;
      else if (rainfall > data.rainfall) data.rainfall = rainfall;
    }
  }
  if (weatherJSON.rain != undefined) {
    // if (!isNaN(weatherJSON.rain["1h"])) data.rain = parseFloat(weatherJSON.rain["1h"]);
    let rainfall = parseFloat(weatherJSON.rain["1h"]);
    if (!isFinite(data.rainfall)) data.rainfall = rainfall;
    else if (rainfall > data.rainfall) data.rainfall = rainfall;
  }

  if (weatherJSON.snow != undefined) {
    // if (!isNaN(weatherJSON.snow["3h"])) data.snow = parseFloat(weatherJSON.snow["3h"]);
    let rainfall = parseFloat(weatherJSON.snow["3h"]);
    if (!isFinite(data.rainfall)) data.rainfall = rainfall;
    else if (rainfall > data.rainfall) data.rainfall = rainfall;
  }
  if (weatherJSON.rain != undefined) {
    // if (!isNaN(weatherJSON.rain["3h"])) data.rain = parseFloat(weatherJSON.rain["3h"]);
    let rainfall = parseFloat(weatherJSON.rain["3h"]);
    if (!isFinite(data.rainfall)) data.rainfall = rainfall;
    else if (rainfall > data.rainfall) data.rainfall = rainfall;
  }

  if (!isNaN(weatherJSON.pop )) data.chanceOfRain = parseInt(weatherJSON.pop*100);

  if (weatherJSON.name != undefined) data.city = weatherJSON.name;

  if (!forecast && !isNaN(weatherJSON.timezone)) data.timeZone = parseInt(weatherJSON.timezone / 60);
  // let timeZone = weatherJSON.timezone || 0;
  if (weatherJSON.sys != undefined) {
    if (weatherJSON.sys.sunrise != undefined) data.sunriseTime = (weatherJSON.sys.sunrise /*+ timeZone*/)*1000;
    if (weatherJSON.sys.sunset != undefined) data.sunsetTime = (weatherJSON.sys.sunset /*+ timeZone*/)*1000;
  }
  if (!isNaN(weatherJSON.dt)) {
    let timestamp = weatherJSON.dt /*+ timeZone*/;
    if (!isNaN(timestamp)) {
      const dateUTC = new Date(timestamp*1000);
      data.weatherTime = dateUTC.getTime();
      data.weatherTimeStr = dateUTC;
      // if (forecast) data.weatherTimeStr = dateUTC;
      // logger.log(`app-side dateUTC = ${dateUTC}`);
    }
  }
  ///
  // const dateUTC_Naw = new Date();
  // logger.log(`app-side dateUTC = ${dateUTC_Naw.toString()}`);
  // data.weatherTime = dateUTC_Naw.getTime();
  // if (!forecast) data.weatherTimeStr = dateUTC_Naw;

  if (!forecast) logger.log(`app-side parseWeather_OpenWeather_API(return ${JSON.stringify(data)})`);
  return data;
}

function parseForecast_OpenWeather_API(forecastJSON) { // ToDo
  // https://openweathermap.org/forecast5#fields_JSON
  if (typeof forecastJSON === 'string') forecastJSON = JSON.parse(forecastJSON);
  logger.log(`app-side parseForecast_OpenWeather()`);
  // logger.log(`app-side forecastJSON = ${JSON.stringify(forecastJSON)}`);
  // logger.log(`app-side forecastJSON.length = ${Object.keys(forecastJSON).length}`);
  // logger.log(`app-side forecastJSON.list.lenght = ${forecastJSON.list.length}`);
  if (forecastJSON == undefined || forecastJSON == null || forecastJSON.length == 0) return undefined;
  if (forecastJSON.list == undefined || forecastJSON.list == null || forecastJSON.list.length == 0) return undefined;
  let data = {};
  let forecast = [];
  let timeZone = 0;
  if (forecastJSON.city != undefined) {
    if (forecastJSON.city.name != undefined) data.city = forecastJSON.city.name;
    if (!isNaN(forecastJSON.city.timezone)) {
      timeZone = forecastJSON.city.timezone;
      data.timeZone = parseInt(forecastJSON.city.timezone / 60);
      // logger.log(`app-side timeZone = ${timeZone}`);
    }
  }

  let weather_element = forecastJSON.list[0];
  let day = -1;
  let currentDay = -1;
  let temp_min = 0;
  let temp_max = 0;
  if (weather_element.main != undefined) {
    temp_min = weather_element.main.temp_min;
    temp_max = weather_element.main.temp_max;
  }
  for (let index = 0; index < forecastJSON.list.length; index++) {
    weather_element = forecastJSON.list[index];
    if (!isNaN(weather_element.dt)) {
      let timestamp = weather_element.dt;
      timestamp += timeZone;
      if (!isNaN(timestamp)) {
        // logger.log(`app-side weather_element = ${JSON.stringify(weather_element)}`);
        const dateUTC = new Date(timestamp*1000);
        let hour = dateUTC.getUTCHours();
        currentDay = dateUTC.getUTCDate();
        if (currentDay != day) {
          day = currentDay;
          if (forecast.length > 0) {
            forecast[forecast.length-1].temperatureMin = temp_min;
            forecast[forecast.length-1].temperatureMax = temp_max;
            if (weather_element.main != undefined) {
              temp_min = weather_element.main.temp_min;
              temp_max = weather_element.main.temp_max;
            }
          }
        }
        if (weather_element.main != undefined) {
          if (weather_element.main.temp_min != undefined && weather_element.main.temp_min < temp_min) temp_min = weather_element.main.temp_min;
          if (weather_element.main.temp_max != undefined && weather_element.main.temp_max > temp_max) temp_max = weather_element.main.temp_max;
        }
        // logger.log(`app-side dateUTC = ${dateUTC.toString()}`);
        if (hour > 10 && hour < 14) { // добавляем только данны для 12 часов
          let forecast_json = parseWeather_OpenWeather_API(weather_element, true);
          forecast.push(forecast_json);
        }
      }
    }
  }
  
  if (currentDay == day && forecast.length > 0) {
    forecast[forecast.length-1].temperatureMin = temp_min;
    forecast[forecast.length-1].temperatureMax = temp_max;
  }

  const dateNaw = new Date();
  // logger.log(`app-side dateNaw = ${dateNaw.toString()}`);
  data.weatherTime = dateNaw.getTime();
  data.weatherTimeStr = dateNaw;

  data.forecast = forecast;

  logger.log(`app-side parseForecast_OpenWeather_API(return ${JSON.stringify(data)})`);
  return data;
}

function parseWeather_AccuWeather(htmlStr) {
  logger.log(`app-side parseWeather_AccuWeather()`);
  if (typeof htmlStr != 'string') return null;
  // var element = new this.DOMParser().parseFromString(htmlStr, "text/xml");
  if (htmlStr == undefined || htmlStr == null || htmlStr.length < 5) return null;
  // logger.log(`app-side html = ${htmlStr}`);

  // logger.log("app-side this = " + Object.keys(this));
  // let element = new this.DOMParser().parseFromString(htmlStr, "text/xml");
  // logger.log(`app-side element = ${element}`);
  let data = {};
  try {

    let strUnit = htmlStr.match(/<span class="unit">([a-zA-Z]+)<\/span>/)[1];
    let imperialUnit = strUnit == 'F';
    // logger.log(`app-side strUnit = ${strUnit}, imperialUnit = ${imperialUnit}`);
    let temperature_values;
    let realFeel_values;
    let temperatureMaxMin_values;
    let windSpeed_values;
    let windGusts_values;
    let windTitle_values;
    let windDirection_values;

    let timeZone = 0;
    let timezoneValue = parseFloat(htmlStr.match(/"gmtOffset":\s*([\+\-]?\d+(\.\d+)?)/)[1]);
    let timezoneHour = parseInt(timezoneValue);
    let timezoneMin = parseInt((timezoneValue % 1) * 60 );
    // logger.log(`app-side timezoneStr = ${timezoneValue}, timezoneHour = ${timezoneHour}, timezoneMin = ${timezoneMin}`);
    timeZone = timezoneHour * 60 + timezoneMin;

    let startIndex = htmlStr.indexOf('class="header-city-link"');
    let endIndex = htmlStr.indexOf("</h1>", startIndex);
    let str_city = htmlStr.substring(startIndex, endIndex);
    str_city = decodeHtmlEntities(str_city);
    startIndex = str_city.indexOf('"header-loc">');
    str_city = str_city.substring(startIndex + '"header-loc">'.length);
    logger.log(`app-side str_city = ${str_city}`);
    let city_loc = str_city.split(',');
    data.city = city_loc[0].trim();
    data.district = city_loc[1].trim();
    // logger.log(`app-side city = ${data.city}`);

    let diffTime = 0;
    // первый блок данных
    startIndex = htmlStr.indexOf( 'class="current-weather-card card-module content-module');
    endIndex = htmlStr.indexOf('class="half-day-card  content-module');
    if (startIndex > 0 && endIndex > startIndex) {
      let str_current = htmlStr.substring(startIndex, endIndex);
      str_current = decodeHtmlEntities(str_current);
      // logger.log(`app-side str_current = ${str_current}`);
      // Регулярные выражения для поиска данных

      // блок времени
      let str_time_info_class = str_current.match( /class="card-header spaced-content">(.*?)<\/div>/gs)[0];
      // logger.log(`app-side str_time_info_class = ${str_time_info_class}`);
      let time_values = str_time_info_class.match( /class="sub">([\s\S]*?)<\/p>/g)[0]; // текущее время
      // logger.log(`app-side time_values = ${time_values}`);

      //#region текущее время
      let time_hour = parseInt(time_values.match( /(\d+)/g)[0]); // текущее время часы
      let time_minute = parseInt(time_values.match( /(\d+)/g)[1]); // текущее время минуты
      // logger.log(`app-side time_hour = ${time_hour}`);
      // logger.log(`app-side time_minute = ${time_minute}`);

      if (time_values.indexOf('PM') > 0) {
        time_hour += 12;
        if (time_hour == 24) time_hour = 12;
      }
      if (time_values.indexOf('AM') > 0) {
        if (time_hour == 12) time_hour = 0;
      }

      let time_now = new Date();
      // logger.log(`app-side time_now = ${time_now.toString()}`);
      let time_now_int = time_now.getHours()*60 + time_now.getMinutes();
      let time_now_utc_int = time_now.getUTCHours()*60 + time_now.getUTCMinutes();
      let time_int = time_hour*60 + time_minute;
      let diffTime_utc = time_now_int - time_now_utc_int;
      diffTime = time_int - time_now_int + diffTime_utc;
      // if (diffTime > 14*60) diffTime = diffTime - 24*60;
      // logger.log(`app-side diffTime_utc = ${diffTime_utc}`);
      // logger.log(`app-side diffTime = ${diffTime}`);
      //#endregion


      //#region Температура
      let str_weather_info_class = str_current.match( /class="current-weather-info">(.*?)<div class="current-weather-extra no-realfeel-phrase">/gs)[0];
      data.weatherDescriptionExtended = str_weather_info_class.match( /<div class="phrase">(.*?)<\/div>/s)[1]; // описание погоды
      // Иконка
      let weather_icon = parseInt(str_current.match( /data-src="[\D]*(\d+).svg"/)[1]);
      let value = iconFrom_AccuWeather(weather_icon);
      // logger.log(`app-side weather_icon value = ${JSON.stringify(value)}, weather_icon = ${weather_icon}`);
      data.weatherIcon = value.index;
      data.weatherIconPeriod = value.time_of_day;
      // Температура
      let temperature_match = str_current.match( /class="display-temp">([\+\-]?\d+)/g);
      temperature_values = temperature_match.map( (match) => match.match(/[\+\-]?\d+/g)[0]);
      if (imperialUnit) temperature_values = fahrenheitToCelsius(temperature_values);
      // logger.log(`app-side temperature_match = ${temperature_match}`);
      // logger.log(`app-side temperature_values = ${temperature_values}`);

      // Ощущается как
      let realFeel_match = str_current.match( /class="current-weather-extra no-realfeel-phrase"[\D]*([\+\-]?\d+)/g ) || [];
      realFeel_values = realFeel_match.map( (match) => match.match(/[\+\-]?\d+/g)[0]);
      if (imperialUnit) realFeel_values = fahrenheitToCelsius(realFeel_values);
      // logger.log(`app-side realFeel_match = ${realFeel_match}`);
      // logger.log(`app-side realFeel_values = ${realFeel_values}`);

      //#endregion

      // Перебор данных в блоке
      let detail_item = [];
      startIndex = 0;
      endIndex = str_current.indexOf('<div class="current-weather-details');
      if (endIndex > 0) str_current = str_current.substring(endIndex);
      endIndex = str_current.indexOf("<div class", 5);
      while (endIndex > 0) {
        // logger.log(`app-side startIndex = ${startIndex}; endIndex = ${endIndex}`);
        let str_item = str_current.substring(startIndex, endIndex);
        str_current = str_current.substring(endIndex);
        // str_item = str_item.trim();
        // logger.log(`app-side str_item = ${str_item}`);
        if (str_item.startsWith('<div class="detail-item spaced-content')) { 
          detail_item.push(str_item);
          // logger.log(`app-side str_item = ${str_item}`);
        }
        // logger.log(`app-side str_current new = ${str_current}`);
        endIndex = str_current.indexOf("<div class", 5);
        // logger.log(`app-side endIndex new = ${endIndex}`);
      }
      // logger.log(`app-side detail_item = ${detail_item}`);
      
      detail_item.forEach(element => {
        // logger.log(`app-side element = ${element}`);
        if (element.indexOf(text_id.element_text_id_UVI) > 0) {
          data.uvi = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side CurrentWeather UVI = ${data.uvi}`);
        }

        if (element.indexOf(text_id.element_text_id_windSpeed) > 0 && element.indexOf(text_id.element_text_id_windGusts) < 0) {
          windSpeed_values = parseInt(element.match(/\d+/)[0]); // км/ч
          if (imperialUnit) windSpeed_values = milesToKilometers(windSpeed_values);
          // logger.log(`app-side windSpeed_values км/ч = ${windSpeed_values}`);
          windSpeed_values = windSpeed_values / 3.6; // м/с
          // logger.log(`app-side windSpeed_values м/с = ${windSpeed_values}`);

          endIndex = element.indexOf("</div>");
          let tempStr = element.substring(endIndex);
          startIndex = tempStr.indexOf("<div>") + 5;
          endIndex = tempStr.indexOf(" ");
          windTitle_values = tempStr.substring(startIndex, endIndex).trim();
          // logger.log(`app-side windTitle_values = ${windTitle_values}`);
          windDirection_values = windStrToAndle(windTitle_values);

          data.windSpeed = Number(parseFloat(windSpeed_values).toFixed(2));
          data.windTitle = windTitle_values;
          data.windDirection = windDirection_values;
          // logger.log(`app-side windSpeed = ${data.windSpeed}`);
          // logger.log(`app-side windTitle = ${data.windTitle}`);
          // logger.log(`app-side windDirection = ${data.windDirection}`);
        }

        if (element.indexOf(text_id.element_text_id_windGusts) > 0) {
          windGusts_values = parseInt(element.match(/\d+/)[0]); // км/ч
          if (imperialUnit) windGusts_values = milesToKilometers(windGusts_values);
          windGusts_values = windGusts_values / 3.6; // м/с
          data.windGusts = Number(parseFloat(windGusts_values).toFixed(2));
          // logger.log(`app-side windGusts = ${data.windGusts}`);
        }

        if (!data.humidity && element.indexOf(text_id.element_text_id_humidity) > 0) {
          data.humidity = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side CurrentWeather humidity = ${data.humidity}`);
        }

        if (element.indexOf(text_id.element_text_id_pressure) > 0) {
          let pressure_values = parseInt(element.match(/\d+/)[0]); // hPa
          if (imperialUnit) pressure_values = inHgToHpa(pressure_values);
          data.pressure = pressure_values;
  
          endIndex = element.indexOf("</div>");
          let tempStr = element.substring(endIndex);
          startIndex = tempStr.indexOf("<div>") + 5;
          endIndex = tempStr.indexOf(" ");
          let pressureTrend = 0;
          let pressureTrend_values = tempStr.substring(startIndex, endIndex).trim();
          if (pressureTrend_values == "↓") pressureTrend = -1;
          if (pressureTrend_values == "↑") pressureTrend = 1;
          if (pressureTrend_values == "↔") pressureTrend = 0;
          data.pressureTrend = pressureTrend;
          // logger.log(`app-side pressure = ${data.pressure}`);
          // logger.log(`app-side pressureTrend = ${data.pressureTrend}`);
        }

        if (element.indexOf(text_id.element_text_id_cloudiness) > 0) {
          data.cloudiness = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side CurrentWeather cloudiness = ${data.cloudiness}`);
        }

        if (element.indexOf(text_id.element_text_id_visibility) > 0) {
          let visibility_values = parseInt(element.match(/\d+/)[0]);
          if (imperialUnit) visibility_values = milesToKilometers(visibility_values);
          data.visibility = visibility_values*1000;
          // logger.log(`app-side visibility = ${data.visibility}`);
        }

      });

    }

    // второй блок данных
    startIndex = htmlStr.indexOf( 'class="half-day-card  content-module');
    endIndex = htmlStr.indexOf('<script>', startIndex + 1);
    endIndex = htmlStr.indexOf('class="half-day-card  content-module', startIndex + 1);
    if (endIndex < 0 ||htmlStr.indexOf('<script>', startIndex + 1) < endIndex) endIndex = htmlStr.indexOf('<script>', startIndex + 1);

    if (startIndex > 0 && endIndex > startIndex) {
      let str_DayOrNight = htmlStr.substring(startIndex, endIndex);
      str_DayOrNight = decodeHtmlEntities(str_DayOrNight);
      // logger.log(`app-side str_DayOrNight = ${str_DayOrNight}`);
      // Регулярные выражения для поиска данных


      // Перебор данных в блоке
      let detail_item = [];
      startIndex = str_DayOrNight.indexOf('<p class="panel-item');
      endIndex = str_DayOrNight.indexOf('</p>', startIndex + 1);
      while (endIndex > 0) {
        // logger.log(`app-side startIndex = ${startIndex}; endIndex = ${endIndex}`);
        let str_item = str_DayOrNight.substring(startIndex, endIndex);
        str_DayOrNight = str_DayOrNight.substring(endIndex);
        // str_item = str_item.trim();
        // logger.log(`app-side str_item = ${str_item}`);
        detail_item.push(str_item);
        // logger.log(`app-side str_item = ${str_item}`);
        // logger.log(`app-side str_current new = ${str_current}`);
        startIndex = str_DayOrNight.indexOf('<p class="panel-item');
        endIndex = str_DayOrNight.indexOf('</p>', startIndex + 1);
        // logger.log(`app-side endIndex new = ${endIndex}`);
      }
      
      detail_item.forEach(element => {
        // logger.log(`app-side element_DayOrNight = ${element}`);
        // if (element.indexOf(text_id.element_text_id_UVI) > 0) {
        //   data.UVI = parseInt(element.match(/\d+/)[0]);
        //   logger.log(`app-side UVI = ${data.UVI}`);
        // }

        if (!data.windSpeed && element.indexOf(text_id.element_text_id_windSpeed) > 0 && element.indexOf(text_id.element_text_id_windGusts) < 0) {
          windSpeed_values = parseInt(element.match(/\d+/)[0]); // км/ч
          windSpeed_values = windSpeed_values / 3.6; // м/с

          endIndex = element.indexOf("</span>");
          let tempStr = element.substring(0,endIndex);
          startIndex = tempStr.indexOf('"value">') + '"value">'.length;
          endIndex = tempStr.indexOf(" ");
          windTitle_values = tempStr.substring(startIndex, endIndex).trim();
          // logger.log(`app-side DayOrNight windTitle_values = ${windTitle_values}`);
          windDirection_values = windStrToAndle(windTitle_values);

          data.windSpeed = Number(parseFloat(windSpeed_values).toFixed(2));
          data.windTitle = windTitle_values;
          data.windDirection = windDirection_values;
          // logger.log(`app-side DayOrNight windSpeed = ${data.windSpeed}`);
          // logger.log(`app-side DayOrNight windTitle = ${data.windTitle}`);
          // logger.log(`app-side DayOrNight windDirection = ${data.windDirection}`);
        }

        if (!data.windGusts && element.indexOf(text_id.element_text_id_windGusts) > 0) {
          windGusts_values = parseInt(element.match(/\d+/)[0]); // км/ч
          if (imperialUnit) windGusts_values = milesToKilometers(windGusts_values);
          windGusts_values = windGusts_values / 3.6; // м/с
          data.windGusts = Number(parseFloat(windGusts_values).toFixed(2));
          // logger.log(`app-side DayOrNight windGusts = ${data.windGusts}`);
        }

        if (!data.chanceOfRain && element.indexOf(text_id.element_text_id_chanceOfRain) > 0) {
          data.chanceOfRain = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side DayOrNight chanceOfRain = ${data.chanceOfRain}`);
        }

        if (!data.rainfall && element.indexOf(text_id.element_text_id_rainfall) > 0 && element.indexOf(text_id.element_text_id_chanceOfRain) < 0) {
          let rainfall_values = parseFloat(element.match(/\d?[\.\,]?\d+/)[0]);
          if (imperialUnit) rainfall_values = inchesToMillimeters(rainfall_values);
          data.rainfall = rainfall_values;
          // logger.log(`app-side DayOrNight rainfall = ${data.rainfall}`);
        }

        if (!data.humidity && element.indexOf(text_id.element_text_id_humidity) > 0) {
          data.humidity = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side DayOrNight humidity = ${data.humidity}`);
        }

        // if (element.indexOf(text_id.element_text_id_pressure) > 0) {
        //   data.pressure = parseInt(element.match(/\d+/)[0]);
  
        //   endIndex = element.indexOf("</div>");
        //   let tempStr = element.substring(endIndex);
        //   startIndex = tempStr.indexOf("<div>") + 5;
        //   endIndex = tempStr.indexOf(" ");
        //   let pressureTrend = 0;
        //   let pressureTrend_values = tempStr.substring(startIndex, endIndex).trim();
        //   if (pressureTrend_values == "↓") pressureTrend = -1;
        //   if (pressureTrend_values == "↑") pressureTrend = 1;
        //   if (pressureTrend_values == "↔") pressureTrend = 0;
        //   data.pressureTrend = pressureTrend;
        //   logger.log(`app-side pressure = ${data.pressure}`);
        //   logger.log(`app-side pressureTrend = ${data.pressureTrend}`);
        // }

        if (!data.cloudiness && element.indexOf(text_id.element_text_id_cloudiness) > 0) {
          data.cloudiness = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side DayOrNight cloudiness = ${data.cloudiness}`);
        }

        if (!data.visibility && element.indexOf(text_id.element_text_id_visibility) > 0) {
          let visibility_values = parseInt(element.match(/\d+/)[0]);
          if (imperialUnit) visibility_values = milesToKilometers(visibility_values);
          data.visibility = visibility_values*1000;
          // logger.log(`app-side DayOrNight visibility = ${data.visibility}`);
        }

      });

    }

    startIndex = htmlStr.indexOf( 'class="temp-history content-module');
    endIndex = htmlStr.indexOf('class="more-cta-links', startIndex);
    if (startIndex > 0 && endIndex > startIndex) {
      let str_history = htmlStr.substring(startIndex, endIndex);
      str_history = decodeHtmlEntities(str_history);
      // logger.log(`app-side str_history = ${str_history}`);

      startIndex = str_history.indexOf( 'class="row first"');
      endIndex = str_history.indexOf('class="row"', startIndex);
      // logger.log(`app-side startIndex = ${startIndex}, endIndex = ${endIndex}`);
      if (startIndex > 0 && endIndex > startIndex) {
        let str_historyMaxMin = str_history.substring(startIndex, endIndex);
        // logger.log(`app-side str_historyMaxMin = ${str_historyMaxMin}`);
        // str_history = decodeHtmlEntities(str_history);

        let temperatureMaxMin_match = str_historyMaxMin.match( /class="temperature"[\D]*([\+\-]?\d+)/g ) || [];
        // logger.log(`app-side temperatureMaxMin_match = ${temperatureMaxMin_match}`);
        temperatureMaxMin_values = temperatureMaxMin_match.map( (match) => match.match(/\+?\-?\d+/g ));
        
      }
      
    }

    if (temperature_values) {
      data.temperature = parseInt(temperature_values);
      // logger.log(`app-side temperature = ${data.temperature}`);
    }
    if (realFeel_values) {
      data.temperatureFeels = parseInt(realFeel_values);
      // logger.log(`app-side realFeel = ${data.temperatureFeels}`);
    }

    
    if (temperatureMaxMin_values) {
      let temperatureMax_values = parseInt(temperatureMaxMin_values[0]);
      let temperatureMin_values = parseInt(temperatureMaxMin_values[1]);
      if (imperialUnit) {
        temperatureMax_values = fahrenheitToCelsius(temperatureMax_values);
        temperatureMin_values = fahrenheitToCelsius(temperatureMin_values);
      }
      data.temperatureMax = temperatureMax_values;
      data.temperatureMin = temperatureMin_values;
      // logger.log(`app-side temperatureMax = ${data.temperatureMax}`);
      // logger.log(`app-side temperatureMin = ${data.temperatureMin}`);
    }

    //#region sunrise_sunset
    let sunrise_sunset = htmlStr.match( /<div\s+class\s*=\s*['"]sunrise-sunset__body['"][^>]*>([\s\S]*?)<\/div>[\s]*?<\/div>[\s]*?<\/div>[\s]*?<\/div>/s)[0]; // восход и закат
    sunrise_sunset = decodeHtmlEntities(sunrise_sunset);
    // logger.log(`app-side sunrise_sunset = ${sunrise_sunset}`);
    let sunrise_values = sunrise_sunset.match( /class="sunrise-sunset__times-value">([\s\S]*?)<\/span>/g)[0]; // восход солнца
    let sunset_values = sunrise_sunset.match( /class="sunrise-sunset__times-value">([\s\S]*?)<\/span>/g)[1]; // закат солнца
    let moonrise_values = sunrise_sunset.match( /class="sunrise-sunset__times-value">([\s\S]*?)<\/span>/g)[2]; // восход луны
    let moonset_values = sunrise_sunset.match( /class="sunrise-sunset__times-value">([\s\S]*?)<\/span>/g)[3]; // закат луны
    // logger.log(`app-side sunrise_values = ${sunrise_values}`);
    // logger.log(`app-side sunset_values = ${sunset_values}`);
    // logger.log(`app-side moonrise_values = ${moonrise_values}`);
    // logger.log(`app-side moonset_values = ${moonset_values}`);

    //#region sun
    let sunrise_hour = parseInt(sunrise_values.match( /(\d+)/g)[0]); // восход часы
    let sunset_hour = parseInt(sunset_values.match( /(\d+)/g)[0]); // закат часы
    let sunrise_minute = parseInt(sunrise_values.match( /(\d+)/g)[1]); // восход минуты
    let sunset_minute = parseInt(sunset_values.match( /(\d+)/g)[1]); // закат минуты

    if (sunrise_values.indexOf('PM') > 0) {
      sunrise_hour += 12;
      if (sunrise_hour == 24) sunrise_hour = 12;
    }
    if (sunrise_values.indexOf('AM') > 0) {
      if (sunrise_hour == 12) sunrise_hour = 0;
    }

    if (sunset_values.indexOf('PM') > 0) {
      sunset_hour += 12;
      if (sunset_hour == 24) sunset_hour = 12;
    }
    if (sunset_values.indexOf('AM') > 0) {
      if (sunset_hour == 12) sunset_hour = 0;
    }
    sunrise_hour = sunrise_hour - parseInt(diffTime / 60);
    sunset_hour = sunset_hour - parseInt(diffTime / 60);
    sunrise_minute = sunrise_minute - diffTime % 60;
    sunset_minute = sunset_minute - diffTime % 60;

    let sun_rise = new Date();
    sun_rise.setUTCHours(sunrise_hour);
    sun_rise.setUTCMinutes(sunrise_minute);
    let sun_set = new Date();
    sun_set.setUTCHours(sunset_hour);
    sun_set.setUTCMinutes(sunset_minute);
    data.sunriseTime = sun_rise.getTime();
    data.sunsetTime = sun_set.getTime();
    //#endregion

    //#region moon
    let moonrise_hour = parseInt(moonrise_values.match( /(\d+)/g)[0]); // восход часы
    let moonset_hour = parseInt(moonset_values.match( /(\d+)/g)[0]); // закат часы
    let moonrise_minute = parseInt(moonrise_values.match( /(\d+)/g)[1]); // восход минуты
    let moonset_minute = parseInt(moonset_values.match( /(\d+)/g)[1]); // закат минуты

    if (moonrise_values.indexOf('PM') > 0) {
      moonrise_hour += 12;
      if (moonrise_hour == 24) moonrise_hour = 12;
    }
    if (moonrise_values.indexOf('AM') > 0) {
      if (moonrise_hour == 12) moonrise_hour = 0;
    }

    if (moonset_values.indexOf('PM') > 0) {
      moonset_hour += 12;
      if (moonset_hour == 24) moonset_hour = 12;
    }
    if (moonset_values.indexOf('AM') > 0) {
      if (moonset_hour == 12) moonset_hour = 0;
    }
    moonrise_hour = moonrise_hour - parseInt(diffTime / 60);
    moonset_hour = moonset_hour - parseInt(diffTime / 60);
    moonrise_minute = moonrise_minute - diffTime % 60;
    moonset_minute = moonset_minute - diffTime % 60;

    let moon_rise = new Date();
    moon_rise.setUTCHours(moonrise_hour);
    moon_rise.setUTCMinutes(moonrise_minute);
    let moonset = new Date();
    moonset.setUTCHours(moonset_hour);
    moonset.setUTCMinutes(moonset_minute);
    data.moonriseTime = moon_rise.getTime();
    data.moonsetTime = moonset.getTime();
    //#endregion
    
    //#endregion

    data.timeZone = timeZone;

    const dateNaw = new Date();
    // logger.log(`app-side dateNaw = ${dateNaw.toString()}`);
    data.weatherTime = dateNaw.getTime();
    data.weatherTimeStr = dateNaw;
    
  } catch (error) {
    logger.log(`app-side error = ${error}`);
    return null;
  }

  logger.log(`app-side parseWeather_AccuWeather(return${JSON.stringify(data)})`);
  return data;
}

function parseForecast_AccuWeather(htmlStr) {
  logger.log(`app-side parseForecast_AccuWeather()`);
  if (typeof htmlStr != 'string') return null;
  if (htmlStr == undefined || htmlStr == null || htmlStr.length < 5) return null;
  
  let data = {};
  let forecast = [];
  try {
    let strUnit = htmlStr.match(/<span class="unit">([a-zA-Z]+)<\/span>/)[1];
    let imperialUnit = strUnit == 'F';
    // logger.log(`app-side strUnit = ${strUnit}, imperialUnit = ${imperialUnit}`);

    let startIndex = htmlStr.indexOf('class="header-city-link"');
    let endIndex = htmlStr.indexOf("</h1>", startIndex);
    let str_city = htmlStr.substring(startIndex, endIndex);
    str_city = decodeHtmlEntities(str_city);
    startIndex = str_city.indexOf('"header-loc">');
    str_city = str_city.substring(startIndex + '"header-loc">'.length);
    startIndex = str_city.indexOf(",");
    if (startIndex > 0) str_city = str_city.substring(0, startIndex);
    data.city = str_city;
    logger.log(`app-side city = ${str_city}`);

    
    let timezoneValue = parseFloat(htmlStr.match(/"gmtOffset":\s*([\+\-]?\d+(\.\d+)?)/)[1]);
    let timezoneHour = parseInt(timezoneValue);
    let timezoneMin = parseInt((timezoneValue % 1) * 60 );
    // logger.log(`app-side timezoneStr = ${timezoneValue}, timezoneHour = ${timezoneHour}, timezoneMin = ${timezoneMin}`);
    let timeZone = timezoneHour * 60 + timezoneMin;
    data.timeZone = timeZone;

    startIndex = htmlStr.indexOf('<div class="page-column-1"');
    endIndex = htmlStr.indexOf('<div class="page-column-2"', startIndex);
    if (endIndex < startIndex) endIndex = htmlStr.length;
    htmlStr = htmlStr.substring(startIndex, endIndex);
    htmlStr = decodeHtmlEntities(htmlStr);
    
    startIndex = htmlStr.indexOf('<div class="page-content content-module"');
    endIndex = htmlStr.indexOf('<div class="more-cta-links"', startIndex);
    if (endIndex < startIndex) endIndex = htmlStr.length;
    htmlStr = htmlStr.substring(startIndex, endIndex);
    // logger.log(`app-side htmlStr = ${htmlStr}`);
    
    let count = 0;
    startIndex = htmlStr.indexOf('<div class="daily-wrapper"');
    while (startIndex >= 0 && count < 15) {
      let forecast_json = {};
      endIndex = htmlStr.indexOf('<div class="daily-wrapper"', startIndex + '<div class="daily-wrapper"'.length);
      if (endIndex < startIndex) endIndex = htmlStr.length;
      let dayStr = htmlStr.substring(startIndex, endIndex);
      htmlStr = htmlStr.slice(endIndex);
      // logger.log(`app-side dayStr = ${dayStr}`);

      //#region дата
      let date = dayStr.match( /class="module-header sub date">(\d+\D*\d+)/s)[1];
      // logger.log(`app-side date = ${date}`);
      let day = 1;
      let month = 1;
      let date_match = date.match( /(\d+)/g);
      // logger.log(`app-side date_match = ${date_match}`);
      if(date.indexOf("/") > 0) {
        month = date_match[0];
        day = date_match[1];
      }
      else  {
        day = date_match[0];
        month = date_match[1];
      }
      // logger.log(`app-side month = ${month}, day = ${day}`);

      let dateTemp = new Date();
      dateTemp.setDate(day);
      dateTemp.setMonth(month-1);
      dateTemp.setHours(12);
      dateTemp.setMinutes(0);
      forecast_json.weatherTime = dateTemp.getTime();
      forecast_json.weatherTimeStr = dateTemp;
      // logger.log(`app-side dateTemp = ${dateTemp.toString()}`);
      //#endregion
      
      //#region температура
      startIndex = dayStr.indexOf('<div class="temp"');
      endIndex = dayStr.indexOf('</div>', startIndex + '<div class="temp"'.length);
      if (endIndex < startIndex) endIndex = dayStr.length;
      let temperatureStr = dayStr.substring(startIndex, endIndex);
      let temperatureMax = parseInt(temperatureStr.match( /([\+\-]?\d+)/g)[0]);
      let temperatureMin = parseInt(temperatureStr.match( /([\+\-]?\d+)/g)[1]);
      if (imperialUnit) {
        temperatureMax = fahrenheitToCelsius(temperatureMax);
        temperatureMin = fahrenheitToCelsius(temperatureMin);
      }
      // logger.log(`app-side temperatureStr = ${temperatureStr}, temperatureMax = ${temperatureMax}, temperatureMin = ${temperatureMin}`);
      forecast_json.temperatureMax = temperatureMax;
      forecast_json.temperatureMin = temperatureMin;
      //#endregion

      //#region иконка погоды
      let weather_icon = parseInt(dayStr.match( /data-src="[\D]*(\d+).svg"/s)[1]);
      let value = iconFrom_AccuWeather(weather_icon);
      forecast_json.weatherIcon = value.index;
      forecast_json.weatherIconPeriod = value.time_of_day;
      // logger.log(`app-side weather_icon = ${weather_icon}`);
      //#endregion

      //#region вероятность осадков
      startIndex = dayStr.indexOf('<div class="precip"', endIndex);
      endIndex = dayStr.indexOf('</div>', startIndex + '<div class="precip"'.length);
      if (endIndex < startIndex) endIndex = dayStr.length;
      let precipStr = dayStr.substring(startIndex, endIndex);
      // logger.log(`app-side precipStr = ${precipStr}`);
      let precip = parseInt(precipStr.match( /<\/svg>[\D]*(\d+)/)[1]);
      // logger.log(`app-side chanceOfRain = ${precip}`);
      forecast_json.chanceOfRain = precip;
      //#endregion

      startIndex = dayStr.indexOf('<div class="half-day-card-content');
      endIndex = dayStr.indexOf('<div class="daily-wrapper"', startIndex + '<div class="daily-wrapper"'.length);
      if (endIndex < startIndex) endIndex = htmlStr.length;
      dayStr = dayStr.substring(startIndex, endIndex);
      // logger.log(`app-side dayStr = ${dayStr}`);

      //#region облачность
      let weather_description = dayStr.match( /<div class="phrase">(.*?)<\/div>/s)[1];
      // logger.log(`app-side weather_description = ${weather_description}`);
      forecast_json.weatherDescriptionExtended = weather_description;
      //#endregion

      // Перебор данных в блоке
      let detail_item = dayStr.match( /<p class="panel-item">(.*?)<\/p>/g) || [];
      // logger.log(`app-side dayStr = ${dayStr}`);
      // logger.log(`app-side detail_item = ${detail_item}`);
      detail_item.forEach(element => {
        // logger.log(`app-side forecast element = ${element}`);

        if (element.indexOf("RealFeel") > 0 && !forecast_json.RealFeel) {
          let RealFeel_values = parseInt(element.match(/[\+\-]?\d+/g)[0]);
          if (imperialUnit) RealFeel_values = fahrenheitToCelsius(RealFeel_values);
          // logger.log(`app-side RealFeel = ${RealFeel_values}`);
          forecast_json.temperatureFeels = RealFeel_values;
        }

        if (element.indexOf(text_id.element_text_id_UVI) > 0) {
          let UVI_values = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side UVI = ${UVI_values}`);
          forecast_json.uvi = UVI_values;
        }

        if (element.indexOf(text_id.element_text_id_windSpeed) > 0 && element.indexOf(text_id.element_text_id_windGusts) < 0) {
          // logger.log(`app-side element Wind = ${element}`);
          let windSpeed_values = parseInt(element.match(/\d+/)[0]); // км/ч
          if (imperialUnit) windSpeed_values = milesToKilometers(windSpeed_values);
          windSpeed_values = windSpeed_values / 3.6; // м/с

          startIndex = element.indexOf('"value">') + '"value">'.length;
          endIndex = element.indexOf(" ", startIndex);
          let windTitle_values = element.substring(startIndex, endIndex).trim();
          let windDirection_values = windStrToAndle(windTitle_values);

          forecast_json.windSpeed = Number(parseFloat(windSpeed_values.toFixed(2)));
          forecast_json.windTitle = windTitle_values;
          forecast_json.windDirection = windDirection_values;
          // logger.log(`app-side windSpeed = ${windSpeed_values}`);
          // logger.log(`app-side windTitle = ${windTitle_values}`);
          // logger.log(`app-side windDirection = ${windDirection_values}`);
        }

        if (element.indexOf(text_id.element_text_id_windGusts) > 0) {
          let windGusts_values = parseInt(element.match(/\d+/)[0]); // км/ч
          if (imperialUnit) windGusts_values = milesToKilometers(windGusts_values);
          windGusts_values = windGusts_values / 3.6; // м/с
          forecast_json.windGusts = Number(parseFloat(windGusts_values.toFixed(2)));
          // logger.log(`app-side windGusts = ${windGusts_values}`);
        }

        if (element.indexOf(text_id.element_text_id_humidity) > 0) {
          let humidity_values = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side humidity = ${humidity_values}`);
          forecast_json.humidity = humidity_values;
        }

        if (element.indexOf(text_id.element_text_id_cloudiness) > 0) {
          let cloudiness_values = parseInt(element.match(/\d+/)[0]);
          // logger.log(`app-side cloudiness = ${cloudiness_values}`);
          if (!forecast_json.cloudiness) forecast_json.cloudiness = cloudiness_values;
        }

        if (element.indexOf(text_id.element_text_id_pressure) > 0) {
          let pressure_values = parseInt(element.match(/\d+/)[0]);
  
          endIndex = element.indexOf("</div>");
          let tempStr = element.substring(endIndex);
          startIndex = tempStr.indexOf("<div>") + 5;
          endIndex = tempStr.indexOf(" ");
          let pressureTrend = 0;
          let pressureTrend_values = tempStr.substring(startIndex, endIndex).trim();
          if (pressureTrend_values == "↓") pressureTrend = -1;
          if (pressureTrend_values == "↑") pressureTrend = 1;
          if (pressureTrend_values == "↔") pressureTrend = 0;
          // logger.log(`app-side pressure = ${pressure_values}`);
          // logger.log(`app-side pressureTrend = ${pressureTrend}`);
          forecast_json.pressure = pressure_values;
          forecast_json.pressureTrend = pressureTrend;
        }
      });
      
      startIndex = htmlStr.indexOf('<div class="daily-wrapper"');
      forecast.push(forecast_json);
      // logger.log(`app-side forecast_json = ${JSON.stringify(forecast_json)}`);
      count++;

    }

    const dateNaw = new Date();
    // logger.log(`app-side dateNaw = ${dateNaw.toString()}`);
    data.weatherTime = dateNaw.getTime();
    data.weatherTimeStr = dateNaw;

    data.forecast = forecast;
    
  } catch (error) {
    logger.log(`app-side error = ${error}`);
    return null;
  }

  logger.log(`app-side parseForecast_AccuWeather(return ${JSON.stringify(data)})`);
  return data;
  
}

function parseWeather_AccuWeather_API(weatherJSON, globalData) {
  logger.log(`app-side parseWeather_AccuWeather_API()`);
  if (weatherJSON.length == 1) weatherJSON = weatherJSON[0];
  // logger.log(`app-side weatherJSON = ${JSON.stringify(weatherJSON)}`);
  if (weatherJSON == undefined || weatherJSON == null || Object.keys(weatherJSON).length == 0) return undefined;
  let data = {};

  // logger.log(`app-side globalData = ${JSON.stringify(globalData)}`);
  if (globalData) {
    if (globalData.city_name) data.city = globalData.city_name;
    if (globalData.district) data.district = globalData.district;
    if (globalData.timeZone) data.timeZone = globalData.timeZone;
  }

  if (weatherJSON.WeatherText != undefined) data.weatherDescriptionExtended = weatherJSON.WeatherText;
  if (weatherJSON.WeatherIcon != undefined) {
    let value = iconFrom_AccuWeather(weatherJSON.WeatherIcon);
    data.weatherIcon = value.index;
    data.weatherIconPeriod = value.time_of_day;
  }
  if (weatherJSON.IsDayTime != undefined) {
    data.weatherIconPeriod = weatherJSON.IsDayTime ? 'day' : 'night';
  }

  if (weatherJSON.Temperature != undefined && weatherJSON.Temperature.Metric != undefined && weatherJSON.Temperature.Metric.Value != undefined) {
    data.temperature = parseFloat(weatherJSON.Temperature.Metric.Value);
  }
  if (weatherJSON.RealFeelTemperature != undefined && weatherJSON.RealFeelTemperature.Metric != undefined && weatherJSON.RealFeelTemperature.Metric.Value != undefined) {
    data.temperatureFeels = parseFloat(weatherJSON.RealFeelTemperature.Metric.Value);
  }

  if (weatherJSON.TemperatureSummary != undefined) {
    let temperatureSummary = weatherJSON.TemperatureSummary;
    if (temperatureSummary.Past24HourRange != undefined) {
      if (temperatureSummary.Past24HourRange.Minimum != undefined && temperatureSummary.Past24HourRange.Metric != undefined  &&
        temperatureSummary.Past24HourRange.Metric.Value != undefined) data.temperatureMin = parseFloat(temperatureSummary.Past24HourRange.Metric.Value);
      
      if (temperatureSummary.Past24HourRange.Maximum != undefined && temperatureSummary.Past24HourRange.Maximum.Metric != undefined  &&
        temperatureSummary.Past24HourRange.Maximum.Metric.Value != undefined) data.temperatureMax = parseFloat(temperatureSummary.Past24HourRange.Maximum.Metric.Value);
    }
    if (!data.temperatureMin && temperatureSummary.Past12HourRange != undefined) {
      if (temperatureSummary.Past12HourRange.Minimum != undefined && temperatureSummary.Past12HourRange.Metric != undefined  &&
        temperatureSummary.Past12HourRange.Metric.Value != undefined) data.temperatureMin = parseFloat(temperatureSummary.Past12HourRange.Metric.Value);
      
      if (temperatureSummary.Past12HourRange.Maximum != undefined && temperatureSummary.Past12HourRange.Maximum.Metric != undefined  &&
        temperatureSummary.Past12HourRange.Maximum.Metric.Value != undefined) data.temperatureMax = parseFloat(temperatureSummary.Past12HourRange.Maximum.Metric.Value);
    }
    if (!data.temperatureMin && temperatureSummary.Past6HourRange != undefined) {
      if (temperatureSummary.Past6HourRange.Minimum != undefined && temperatureSummary.Past6HourRange.Metric != undefined  &&
        temperatureSummary.Past6HourRange.Metric.Value != undefined) data.temperatureMin = parseFloat(temperatureSummary.Past6HourRange.Metric.Value);
      
      if (temperatureSummary.Past6HourRange.Maximum != undefined && temperatureSummary.Past6HourRange.Maximum.Metric != undefined  &&
        temperatureSummary.Past6HourRange.Maximum.Metric.Value != undefined) data.temperatureMax = parseFloat(temperatureSummary.Past6HourRange.Maximum.Metric.Value);
    }
  }

  if (weatherJSON.RelativeHumidity != undefined) data.humidity = parseInt(weatherJSON.RelativeHumidity);

  if (weatherJSON.Pressure != undefined && weatherJSON.Pressure.Metric != undefined && weatherJSON.Pressure.Metric.Value != undefined) {
    data.pressure = parseInt(weatherJSON.Pressure.Metric.Value);
  }
  if (weatherJSON.PressureTendency != undefined && weatherJSON.PressureTendency.Code != undefined) {
    switch (weatherJSON.PressureTendency.Code) {
      case "F":
      case "f":
        data.pressureTrend = -1;
        break;

      case "S":
      case "s":
        data.pressureTrend = 0;
        break;

    case "R":
    case "r":
      data.pressureTrend = 1;
      break;
    }
  }

  if (weatherJSON.Wind != undefined ) {
    if (weatherJSON.Wind.Speed != undefined && weatherJSON.Wind.Speed.Metric != undefined && weatherJSON.Wind.Speed.Metric.Value != undefined) {
      let windSpeed_values = parseFloat(weatherJSON.Wind.Speed.Metric.Value); // км/ч
      windSpeed_values = windSpeed_values / 3.6; // м/с
      data.windSpeed = Number(parseFloat(windSpeed_values.toFixed(2)));
    }
    if (weatherJSON.Wind.Direction) {
      if (weatherJSON.Wind.Direction.English != undefined) data.windTitle = weatherJSON.Wind.Direction.English;
      if (weatherJSON.Wind.Direction.Localized != undefined) data.windTitle = weatherJSON.Wind.Direction.Localized;
      if (weatherJSON.Wind.Direction.Degrees != undefined) data.windDirection = parseInt(weatherJSON.Wind.Direction.Degrees);
    }
  }
  if (weatherJSON.WindGust != undefined && weatherJSON.WindGust.Speed != undefined && weatherJSON.WindGust.Speed.Metric != undefined && 
    weatherJSON.WindGust.Speed.Metric.Value != undefined) {

    let windGustSpeed_values = parseFloat(weatherJSON.WindGust.Speed.Metric.Value); // км/ч
    windGustSpeed_values = windGustSpeed_values / 3.6; // м/с
    data.windGust = Number(parseFloat(windGustSpeed_values.toFixed(2)));
  }

  if (weatherJSON.CloudCover != undefined) data.cloudiness = parseInt(weatherJSON.CloudCover);

  if (weatherJSON.Visibility != undefined && weatherJSON.Visibility.Metric != undefined && weatherJSON.Visibility.Metric.Value != undefined) {
    data.visibility = parseInt(weatherJSON.Visibility.Metric.Value) * 1000;
  }

  if (weatherJSON.UVIndex != undefined) data.uvi = parseInt(weatherJSON.UVIndex);

  if (weatherJSON.PrecipitationSummary != undefined) {
    let precipitationSummary = weatherJSON.PrecipitationSummary;
    if (precipitationSummary.Past24Hour != undefined) {
      if (precipitationSummary.Past24Hour.Minimum != undefined && precipitationSummary.Past24Hour.Metric != undefined  &&
        precipitationSummary.Past24Hour.Metric.Value != undefined) data.rainfall = parseFloat(precipitationSummary.Past24Hour.Metric.Value);
    }
    if (!data.rainfall && precipitationSummary.Past18Hour != undefined) {
      if (precipitationSummary.Past18Hour.Minimum != undefined && precipitationSummary.Past18Hour.Metric != undefined  &&
        precipitationSummary.Past18Hour.Metric.Value != undefined) data.rainfall = parseFloat(precipitationSummary.Past18Hour.Metric.Value);
    }
    if (!data.rainfall && precipitationSummary.Past12Hour != undefined) {
      if (precipitationSummary.Past12Hour.Minimum != undefined && precipitationSummary.Past12Hour.Metric != undefined  &&
        precipitationSummary.Past12Hour.Metric.Value != undefined) data.rainfall = parseFloat(precipitationSummary.Past12Hour.Metric.Value);
    }
    if (!data.rainfall && precipitationSummary.Past9Hour != undefined) {
      if (precipitationSummary.Past9Hour.Minimum != undefined && precipitationSummary.Past9Hour.Metric != undefined  &&
        precipitationSummary.Past9Hour.Metric.Value != undefined) data.rainfall = parseFloat(precipitationSummary.Past9Hour.Metric.Value);
    }
    if (!data.rainfall && precipitationSummary.Past6Hour != undefined) {
      if (precipitationSummary.Past6Hour.Minimum != undefined && precipitationSummary.Past6Hour.Metric != undefined  &&
        precipitationSummary.Past6Hour.Metric.Value != undefined) data.rainfall = parseFloat(precipitationSummary.Past6Hour.Metric.Value);
    }
  }

  if (weatherJSON.EpochTime != undefined) {
    data.weatherTime = weatherJSON.EpochTime*1000;
    let weatherDate = new Date(data.weatherTime);
    data.weatherTimeStr = weatherDate;
  }

  logger.log(`app-side parseWeather_OpenWeather_API(return ${JSON.stringify(data)})`);
  return data;
}

function parseForecast_AccuWeather_API(forecastJSON, globalData) {
  logger.log(`app-side parseForecast_AccuWeather_API()`);
  if (forecastJSON.length == 1) forecastJSON = forecastJSON[0];
  // logger.log(`app-side forecastJSON = ${JSON.stringify(forecastJSON)}`);
  let data = {};
  let forecast = [];
  
  if (globalData) {
    if (globalData.city_name) data.city = globalData.city_name;
    // if (globalData.district) data.district = globalData.district;
    if (globalData.timeZone) data.timeZone = globalData.timeZone;
  }

  if (forecastJSON.DailyForecasts != undefined && forecastJSON.DailyForecasts.length > 0) {
    for (let i = 0; i < forecastJSON.DailyForecasts.length; i++) {
      let forecast_element = forecastJSON.DailyForecasts[i];
      // logger.log(`app-side forecast_element = ${JSON.stringify(forecast_element)}`);
      let forecast_json = {};
      if (forecast_element.EpochDate != undefined) {
        forecast_json.weatherTime = forecast_element.EpochDate * 1000;
        forecast_json.weatherTimeStr = new Date(forecast_json.weatherTime);
      }

      if (forecast_element.Sun != undefined) {
        if (!isNaN(forecast_element.Sun.EpochRise)) forecast_json.sunriseTime = forecast_element.Sun.EpochRise * 1000;
        if (!isNaN(forecast_element.Sun.EpochSet)) forecast_json.sunsetTime = forecast_element.Sun.EpochSet * 1000;
      }
      if (forecast_element.Moon != undefined) {
        if (!isNaN(forecast_element.Moon.EpochRise)) forecast_json.moonriseTime = forecast_element.Moon.EpochRise * 1000;
        if (!isNaN(forecast_element.Moon.EpochSet)) forecast_json.moonsetTime = forecast_element.Moon.EpochSet * 1000;
      }
      
      if (forecast_element.Temperature != undefined) {
        if (forecast_element.Temperature.Minimum && !isNaN(forecast_element.Temperature.Minimum.Value)) 
          forecast_json.temperatureMin = forecast_element.Temperature.Minimum.Value;
        if (forecast_element.Temperature.Maximum && !isNaN(forecast_element.Temperature.Maximum.Value)) 
          forecast_json.temperatureMax = forecast_element.Temperature.Maximum.Value;
      }

      if (forecast_element.Day != undefined) {
        if (forecast_element.Day.Icon != undefined) {
          let value = iconFrom_AccuWeather(forecast_element.Day.Icon);
          forecast_json.weatherIcon = value.index;
          forecast_json.weatherIconPeriod = value.time_of_day;
        }
  
        if (forecast_element.Day.ShortPhrase != undefined) forecast_json.weatherDescription = forecast_element.Day.ShortPhrase;
        if (forecast_element.Day.LongPhrase != undefined) forecast_json.weatherDescriptionExtended = forecast_element.Day.LongPhrase;

        if (forecast_element.Day.RelativeHumidity != undefined && !isNaN(forecast_element.Day.RelativeHumidity.Average)) 
          forecast_json.humidity = parseInt(forecast_element.Day.RelativeHumidity.Average);

        if (forecast_element.Day.Wind != undefined) {
          if (forecast_element.Day.Wind.Speed && !isNaN(forecast_element.Day.Wind.Speed.Value)) forecast_json.windSpeed = parseFloat(forecast_element.Day.Wind.Speed.Value);
          if (forecast_element.Day.Wind.Direction != undefined) {
            if (forecast_element.Day.Wind.Direction.English != undefined) forecast_json.windTitle = forecast_element.Day.Wind.Direction.English;
            if (forecast_element.Day.Wind.Direction.Localized != undefined) forecast_json.windTitle = forecast_element.Day.Wind.Direction.Localized;
            if (!isNaN(forecast_element.Day.Wind.Direction.Degrees)) forecast_json.windDirection = parseInt(forecast_element.Day.Wind.Direction.Degrees);
          }
        }

        if (forecast_element.Day.WindGust != undefined && forecast_element.Day.WindGust.Speed != undefined) {
          if (!isNaN(forecast_element.Day.WindGust.Speed.Value)) forecast_json.windGusts = parseFloat(forecast_element.Day.WindGust.Speed.Value);
        }

        if (!isNaN(forecast_element.Day.CloudCover)) forecast_json.cloudiness = forecast_element.Day.CloudCover;
        if (!isNaN(forecast_element.Day.PrecipitationProbability)) forecast_json.chanceOfRain = forecast_element.Day.PrecipitationProbability;
        if (forecast_element.Day.TotalLiquid != undefined && !isNaN(forecast_element.Day.TotalLiquid.Value)) 
          forecast_json.rainfall = parseFloat(forecast_element.Day.TotalLiquid.Value);


      }

      if (forecast_element.AirAndPollen != undefined && forecast_element.AirAndPollen.length > 0) {
        for (let j = 0; j < forecast_element.AirAndPollen.length; j++) {
          let item = forecast_element.AirAndPollen[j];
          if (item.Name == "AirQuality") {
            if (!isNaN(item.Value)) forecast_json.aiq = item.Value;
          }
          if (item.Name == "UVIndex") {
            if (!isNaN(item.Value)) forecast_json.uvi = item.Value;
          }
        }
      }


      forecast.push(forecast_json);
    }
  }

  data.forecast = forecast;


  const dateNaw = new Date();
  // logger.log(`app-side dateNaw = ${dateNaw.toString()}`);
  data.weatherTime = dateNaw.getTime();
  data.weatherTimeStr = dateNaw;

  logger.log(`app-side parseForecast_AccuWeather_API(return ${JSON.stringify(data)})`);
  return data;
}

//#endregion

let text_id = {};

AppSideService(
  BaseSideService({
    onInit() {
      logger.log("app side service invoke onInit");

    //   settings.settingsStorage.addListener('change', async ({ key, newValue, oldValue }) => {
    //     logger.log(`app-side settingsStorage.addListener`);
    //     logger.log(`app-side ${key}(${oldValue}, ${newValue})`);
    //     // this.alert(Object.keys(this));
    //     if (key == 'data') {
    //       logger.log(`app-side dataOld = ${JSON.stringify(oldValue)}, dataNew = ${JSON.stringify(newValue)})`);
    //       let data = newValue;
    //       if (data.latitude != undefined && data.latitude != null && data.latitude != 0) settings.settingsStorage.setItem('latitude', data.latitude);
    //       if (data.longitude != undefined && data.longitude != null && data.longitude != 0) settings.settingsStorage.setItem('longitude', data.longitude);
    //     }
    //     this.call({
    //       result: {
    //         key: key,
    //         oldValue: oldValue,
    //         newValue: newValue
    //       }
    //     });
    //   });

    },
    
    onSettingsChange({ key, newValue, oldValue }) {
      logger.log(`app-side onSettingsChange`);
      logger.log(`app-side inputValue =  ${key}(${oldValue}, ${newValue})`);
      // this.alert(Object.keys(this));
      if (key == 'data') {
        logger.log(`app-side dataOld = ${oldValue}, dataNew = ${newValue})`);
        let data = JSON.parse(newValue);
        logger.log(`app-side data = ${JSON.stringify(data)}`);
        if (data.latitude != undefined && data.latitude != null && data.latitude != 0) settings.settingsStorage.setItem('latitude', data.latitude);
        if (data.longitude != undefined && data.longitude != null && data.longitude != 0) settings.settingsStorage.setItem('longitude', data.longitude);
        settings.settingsStorage.setItem('data', '{}');
      }
      this.call({
        result: {
          key: key,
          oldValue: oldValue,
          newValue: newValue
        }
      })
    },

    onRequest(req, res) {
      logger.log(`app-side onRequest.method = ${req.method}`);
      
      if (req.textID != undefined && req.textID != null) {
        logger.log(`app-side onRequest.textID = ${JSON.stringify(req.textID)}`);
        text_id = req.textID;
      }
      if (req.method === "GET") {
        fetchData(res, req.url, req.site, req.type, req.globalData);
      }
      if (req.method === "GET_location") {
        fetchLocation(res, req.url, req.site);
      }
      if (req.method === "GET_settings") {
        let result = {
          latitude: settings.settingsStorage.getItem('latitude') || 0,
          longitude: settings.settingsStorage.getItem('longitude') || 0,
          OpenWeather_APIkey: settings.settingsStorage.getItem('OpenWeather_APIkey') || '',
          AccuWeather_APIkey: settings.settingsStorage.getItem('AccuWeather_APIkey') || '',
        };
        logger.log(`app-side GET_settings result = ${JSON.stringify(result)}`);
        res(null, result);
      }
      if (req.method === "SET_location") {
        if (req.location != undefined && req.location.lat != undefined && req.location.lon != undefined) {
          settings.settingsStorage.setItem('latitude', req.location.lat);
          settings.settingsStorage.setItem('longitude', req.location.lon);
        }
        res(null, {
          result: "set location successful",
        });
      }
      if (req.method === "Update_GPS") {
        let data = { 
          Update_GPS: true, 
          latitude: settings.settingsStorage.getItem('latitude', 0),
          longitude: settings.settingsStorage.getItem('longitude', 0),
        };
        settings.settingsStorage.setItem('data', JSON.stringify(data));
        res(null, {
          result: "Update_GPS start",
        });
      }
    },

    onRun() {
      logger.log("app side service invoke onRun");
    },
    onDestroy() {
      logger.log("app side service invoke onDestroy");
    },
  })
);
