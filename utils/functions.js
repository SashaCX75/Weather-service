export function parseWeather_OpenWeather(weatherData, globalData, logger) {
  // https://openweathermap.org/current#fields_json
  logger.log(`parseWeather_OpenWeather()`);
  // logger.log(`weatherData = ${weatherData}`);
  logger.log(`weatherData.lenght = ${weatherData.length}`);
  if (weatherData == undefined || weatherData == null || weatherData.length == 0) return false;
  let fethData = [];
  globalData.weatherJson = {};

  JSON.parse(weatherData, function (key, value) {
    if (typeof value != "object") {
      fethData.push({ [key]: value });
    }
  });

  let timestamp = 0;
  for (let index in fethData) {
    let item = JSON.stringify(fethData[index]);
  //   logger.log(`item = ${item}`);

    JSON.parse(item, function (kkey, val) {
      let k = kkey;
      let v = val;

      if (k == "icon") {
        if (v == "01n") wethPicture = "01n.png";
        if (v == "01d") wethPicture = "01d.png";
        if (v == "04n") wethPicture = "04n.png";
        if (v == "04d") wethPicture = "04d.png";
        if (v == "02n") wethPicture = "02n.png";
        if (v == "02d") wethPicture = "02d.png";
        if (v == "03n") wethPicture = "03n.png";
        if (v == "03d") wethPicture = "03d.png";
        if (v == "09n" || v == "09d") wethPicture = "09d.png";
        if (v == "10d" || v == "10n") wethPicture = "10d.png";
        if (v == "11n" || v == "11d") wethPicture = "11d.png";
        if (v == "13n" || v == "13d") wethPicture = "13d.png";
        if (v == "50d") wethPicture = "50d.png";
        if (v == "50n") wethPicture = "50n.png";

        globalData.weatherJson.weatherIcon = parseInt(v);
        switch ( v.slice(-1) ){
          case "d":
              globalData.weatherJson.weatherIconPeriod = 'day';
              break;
              
          case "n":
              globalData.weatherJson.weatherIconPeriod = 'night';
              break;
        
          default:
              globalData.weatherJson.weatherIconPeriod = 'unknown';
              break;
        }
      }

      if (k == "main") {
        globalData.weatherJson.weatherDescription = v;
      }
      
      if (k == "description") {
          globalData.weatherJson.weatherDescriptionExtended = v;
        }

      if (k == "temp") {
        if (!isNaN(v)) {
          let tmp = Math.round(parseFloat(v));
          globalData.weatherJson.temperature = tmp;
        }
      }

      if (k == "feels_like") {
        if (!isNaN(v)) {
          let tmp = Math.round(parseFloat(v));
          globalData.weatherJson.temperatureFeels = tmp;
        }
      }

      if (k == "humidity") {
        if (!isNaN(v)) {
          let hmdt = parseInt(v);
          globalData.weatherJson.humidity = hmdt;
        }
      }

      if (k == "grnd_level") {
        if (!isNaN(v)) {
          let press = parseInt(v);
          globalData.weatherJson.pressure = press;
        }
      }

      if (k == "speed") {
        if (!isNaN(v)) {
          let spd = Math.round(parseFloat(v));
          globalData.weatherJson.windSpeed = spd;
        }
      }

      if (k == "deg") {
        if (!isNaN(v)) {
          let dg = parseFloat(v);
          globalData.weatherJson.windDirection = dg;

          // if (dg >= 348.75 || dg < 11.25)
          //   globalData.weatherJson.windDirection = "wind1.png";
          // if (dg >= 11.25 && dg < 33.75)
          //   globalData.weatherJson.windDirection = "wind1.png";
          // if (dg >= 33.75 && dg < 56.25)
          //   globalData.weatherJson.windDirection = "wind2.png";
          // if (dg >= 56.25 && dg < 78.75)
          //   globalData.weatherJson.windDirection = "wind3.png";
          // if (dg >= 78.75 && dg < 101.25)
          //   globalData.weatherJson.windDirection = "wind3.png";
          // if (dg >= 101.25 && dg < 123.75)
          //   globalData.weatherJson.windDirection = "wind3.png";
          // if (dg >= 123.75 && dg < 146.25)
          //   globalData.weatherJson.windDirection = "wind4.png";
          // if (dg >= 146.25 && dg < 168.75)
          //   globalData.weatherJson.windDirection = "wind5.png";
          // if (dg >= 168.75 && dg < 191.25)
          //   globalData.weatherJson.windDirection = "wind5.png";
          // if (dg >= 191.25 && dg < 213.75)
          //   globalData.weatherJson.windDirection = "wind5.png";
          // if (dg >= 213.75 && dg < 236.25)
          //   globalData.weatherJson.windDirection = "wind6.png";
          // if (dg >= 236.25 && dg < 258.75)
          //   globalData.weatherJson.windDirection = "wind7.png";
          // if (dg >= 258.75 && dg < 281.25)
          //   globalData.weatherJson.windDirection = "wind7.png";
          // if (dg >= 281.25 && dg < 303.75)
          //   globalData.weatherJson.windDirection = "wind7.png";
          // if (dg >= 303.75 && dg < 326.25)
          //   globalData.weatherJson.windDirection = "wind8.png";
          // if (dg >= 326.25 && dg < 348.75)
          //   globalData.weatherJson.windDirection = "wind1.png";
          
        }
      }

      if (k == "name") {
        globalData.weatherJson.cityName = v;
      }

      if (k == "dt") {
        globalData.weatherJson.weatherTimeUTC = v;
        timestamp += v;
        // console.log(`dt = ${v}, timestamp = ${timestamp}`);
      }

      if (k == "timezone") {
        timestamp += v;
        // console.log(`timezone = ${v}, timestamp = ${timestamp}`);
      }
    });
  }
  if (timestamp > 0) {
    const date = new Date(timestamp*1000);
    console.log(`date = ${date.toString()}`);
    globalData.weatherJson.weatherTime = date;
  }
  
  logger.log(`parseWeather(return true)`);
  return true;
}

export function parseForecast_OpenWeather(weatherData, globalData, logger) {
  // https://openweathermap.org/forecast5#fields_JSON
  logger.log(`parseForecast_OpenWeather()`);
  // logger.log(`weatherData = ${weatherData}`);
  logger.log(`weatherData.lenght = ${weatherData.length}`);
  if (weatherData == undefined || weatherData == null || weatherData.length == 0) return false;
  let weatherDataJson;
  // let fethData;
  globalData.forecastJson = {};
  globalData.forecastJson = weatherData;

  try {
    weatherDataJson = JSON.parse(weatherData);
    if (weatherDataJson.body != undefined && weatherDataJson.body.list != undefined && weatherDataJson.body.cnt != undefined) {
      logger.log(`list = ${weatherDataJson.body.list}`);
      let count = weatherDataJson.body.cnt;
      logger.log(`count = ${count}`);
      let array  = weatherDataJson.body.list;
      let indexTemp = 0;
      if (count = array.length) {
        array.forEach(element => {
          let tempJson;
          for (let index in element) {
            let item = JSON.stringify(element[index]);
            logger.log(`item = ${item}`);
        
            JSON.parse(item, function (kkey, val) {
              let k = kkey;
              let v = val;
              logger.log(`indexTemp = ${indexTemp}, k = ${k}, v = ${v}`);
              
            });
          }
          indexTemp ++;
        });
        let item = array[0];
        logger.log(`item = ${JSON.stringify(item)}`);
      }

    }
  } catch (error) {
    logger.log(`error = ${error}`);
    return false;
  }
  
  logger.log(`parseForecast(return false)`);
  return false;
}

export function parseForecast_Yandex(html, globalData, logger) {
  logger.log(`parseForecast_Yandex()`);
  logger.log(`html = ${html}`);
  logger.log(`weatherData.lenght = ${html.length}`);
  if (html == undefined || html == null || html.length == 0) return false;

  try {
    // Регулярные выражения для поиска данных
    const temperatureMatch = html.match(/<span class="temp__value[^>]*>(\+?\d+)<\/span>/i);
    const conditionMatch = html.match(/<div class="link__condition[^>]*>(.*?)<\/div>/i);
    const windSpeedMatch = html.match(/<span class="wind-speed">(\d+,\d+)<\/span>/i);
    const windTitleMatch = html.match(/<abbr class="icon-abbr" title="Ветер: ([^"]+)" aria-label="Ветер: [^"]+" role="text">/i);
    const humidityMatch = html.match(/<i class="icon icon_humidity-white term__fact-icon"[^>]*>(\d+)%<\/div>/i);
    const pressureMatch = html.match(/<i class="icon icon_pressure-white[^>]*"><\/i>(\d+) <span class="fact__unit">мм рт\. ст\.<\/span>/i);

    if (temperatureMatch) logger.log(`temperature = ${temperatureMatch[1]}`);
    if (conditionMatch) logger.log(`condition = ${conditionMatch[0]}`);
    if (windSpeedMatch) logger.log(`windSpeed = ${windSpeedMatch[0]}`);
    if (windTitleMatch) logger.log(`windTitle = ${windTitleMatch[0]}`);
    if (humidityMatch) logger.log(`humidity = ${humidityMatch[0]}`);
    if (pressureMatch) logger.log(`pressure = ${pressureMatch[0]}`);

  } catch (error) {
    logger.log(`error = ${error}`);
    return false;
  }
  
  logger.log(`parseForecast(return false)`);
  return false;
}
