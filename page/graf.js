import { getText } from '@zos/i18n'
import { BasePage } from '@zeppos/zml/base-page'
import { createWidget, widget, prop, align, text_style, event } from '@zos/ui'
import { setStatusBarVisible, redraw  } from '@zos/ui'
import { showToast } from '@zos/interaction'
import { getDeviceInfo } from '@zos/device'
import { log, px } from '@zos/utils'
import { push, back} from '@zos/router'
import { setScrollLock } from '@zos/page'
import { setPageBrightTime, resetPageBrightTime } from '@zos/display'
import { Time, TIME_HOUR_FORMAT_12 } from '@zos/sensor'
import { getDateFormat, DATE_FORMAT_YMD, DATE_FORMAT_DMY, DATE_FORMAT_MDY } from '@zos/settings'
import { BTN_BACK, TXT_FORECAST_TIME } from 'zosLoader:./index.[pf].layout.js'

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT  } = getDeviceInfo();
const logger = log.getLogger("Weather_Forecast.graf");
const time = new Time();
setStatusBarVisible(false);

let globalData = getApp()._options.globalData;
let forecastJson = globalData.forecastJson;
let storage = globalData.storage;
let colorMax = 0xf04119;
let colorMin = 0x10aaff;

let canvas;

//#region functions
function drawLine(x1, y1, x2, y2, color, line_width) {
	if (x1 > x2) {
		let temp_x = x1;
		let temp_y = y1;
		x1 = x2;
		y1 = y2;
		x2 = temp_x;
		y2 = temp_y;
	};
	canvas.setPaint({ color: color, line_width: line_width });
	canvas.drawLine({ x1: x1, y1: y1, x2: x2, y2: y2 });
};

function drawRect(x1, y1, x2, y2, color) {
	if (x1 > x2) {
		let temp_x = x1;
		let temp_y = y1;
		x1 = x2;
		y1 = y2;
		x2 = temp_x;
		y2 = temp_y;
	};
	canvas.drawRect({ x1: x1, y1: y1, x2: x2, y2: y2, color: color });
};

// function drawCircle(center_x, center_y, color, radius) {
// 	canvas.drawCircle({ center_x: center_x, center_y: center_y, radius: radius, color: color });
// };

function drawGraphPoint(x, y, color, pointSize, pointType) {
	switch (pointType) {
		case 1:
			x -= pointSize/2;
			y -= pointSize/2;
			drawRect(x, y, x+pointSize, y+pointSize, color);
			break;
		case 2:
			let posX = x - pointSize/2;
			let posY = y - pointSize/2;
			drawRect(posX, posY, posX+pointSize, posY+pointSize, color );
			posX = x - pointSize/4;
			posY = y - pointSize/4;
			drawRect(posX, posY, posX+pointSize/2, posY+pointSize/2, 0xffffff );
			break;
		case 3:
			// drawCircle(x, y, color, pointSize/2 );
			canvas.drawCircle({ center_x: x, center_y: y, radius: pointSize/2, color: color });
			break;
		case 4:
			// drawCircle(x, y, color, pointSize/2 );
			// drawCircle(x, y, 0xffffff, pointSize/4 );
			canvas.drawCircle({ center_x: x, center_y: y, radius: pointSize/2, color: color });
			canvas.drawCircle({ center_x: x, center_y: y, radius: pointSize/4, color: 0xffffff });
			break;
	}
};

function graphScale(heightGraph, maxPointSize, minPointSize, forecastData, daysCount) {
	logger.log(`function graphScale`);
	// logger.log(`heightGraph: ${heightGraph}, maxPointSize: ${maxPointSize}, minPointSize: ${minPointSize}, daysCount: ${daysCount}`);
	logger.log(`forecastData.length: ${forecastData.length}`);
	// logger.log(`forecastData: ${JSON.stringify(forecastData)}`);
	heightGraph -= (maxPointSize + minPointSize) / 2;
	let high = -300;
	let low = 300;
	for (let index = 0; index < daysCount; index++) {
		if (index < forecastData.length) {
			logger.log(`forecastData[${index}]: ${JSON.stringify(forecastData[index])}`);
			let item = forecastData[index];
			if (item.high > high) high = item.high;
			if (item.low < low) low = item.low;
		} // end if
	} // end for
	let delta = high - low;
	let scale = heightGraph / delta;
	logger.log(`heightGraph: ${heightGraph}; high: ${high}; low : ${low}`);
	return {graphScale: scale, maximal_temp: high};
};

function weather_few_days(forecastData) {
	logger.log('weather_few_days()');
	// let weatherData = weatherSensor.getForecastWeather();
	// let forecastData = weatherData.forecastData;
	let result = {graphScale: 1, maximal_temp: 0};
	let maxOldX = 0;
	let minOldX = 0;

	result = graphScale(125, 10, 10, forecastData, 5);
	let forecastGraphScale = result.graphScale;
	let maximal_temp = result.maximal_temp;
	// logger.log(`forecastGraphScale = ${forecastGraphScale}, maximal_temp = ${maximal_temp}`);

	canvas.clear({x: 0, y:0, w: DEVICE_WIDTH, h: px(150)});
	let max_offsetX = 5;
	maxOldX = max_offsetX;
	let maxOldY = px((maximal_temp - forecastData[0].high) * forecastGraphScale + 5);
	let endPointMax = false;
	let min_offsetX = 5;
	minOldX = min_offsetX;
	let minOldY = px((maximal_temp - forecastData[0].low) * forecastGraphScale + 5);
	let endPointMin = false;
	for (let i = 0; i < 5; i++) {
		// Graph
		if (i < forecastData.length) {
			let maxStartX = maxOldX;
			let maxStartY = maxOldY;
			maxOldX = px(max_offsetX + i * 80);
			maxOldY = px((maximal_temp - forecastData[i].high) * forecastGraphScale + 5);
			let maxEndX = maxOldX;
			let maxEndY = maxOldY;
			if (maxStartX != maxEndX) {
				drawLine(maxStartX, maxStartY, maxEndX, maxEndY, colorMax, 3)
				drawGraphPoint(maxStartX, maxStartY, colorMax, 8, 3)
				endPointMax = true;
			};
		
			let minStartX = minOldX;
			let minStartY = minOldY;
			minOldX = px(min_offsetX + i * 80);
			minOldY = px((maximal_temp - forecastData[i].low) * forecastGraphScale + 5);
			let minEndX = minOldX;
			let minEndY = minOldY;
			if (minStartX != minEndX) {
				drawLine(minStartX, minStartY, minEndX, minEndY, colorMin, 3)
				drawGraphPoint(minStartX, minStartY, colorMin, 8, 3)
				endPointMin = true;
			};
		
		};
		
	};  // end for

	if (endPointMax) {
		drawGraphPoint(maxOldX, maxOldY, colorMax, 8, 3)
	};
	if (endPointMin) {
		drawGraphPoint(minOldX, minOldY, colorMin, 8, 3)
	};
};

//#endregion

class Day {
	constructor(x, y, icon, dow_index,  date, tMax, tMin, chanceOfRain) {
		let group;
		group = createWidget(widget.GROUP, {
			x: x,
			y: y,
			w: px(70),
			h: px(300),
		});
		this.fiil_rect = group.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(70),
			h: px(300),
      radius: px(20),
      color: 0x353535
    });

		let dayStr = getText(`day_of_week_${dow_index}`);
    logger.log(`dow_index = ${dow_index}, dayStr = ${dayStr}`);
    let color = 0xffffff;
    if (dow_index == 0 || dow_index == 6) color = 0xff0000;
    this.dow = group.createWidget(widget.TEXT, {
      x: 0,
      y: 0,
      w: px(70),
      h: px(30),
      text_size: px(22),
      color: color,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: dayStr,
    });

    this.date = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(30),
      w: px(70),
      h: px(25),
      text_size: px(22),
      color: 0xffce9c,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: date,
    });

    this.icon = group.createWidget(widget.IMG, {
      x: px(10),
      y: px(50),
			w: px(50),
			h: px(50),
			center_x: px(60)/2,
			center_y: px(60)/2,
			auto_scale: true,
			auto_scale_obj_fit: true,
      src: icon,
    });

		this.fiil_rect = group.createWidget(widget.FILL_RECT, {
      x: 4,
      y: px(97),
      w: px(70)-8,
			h: 2,
      color: 0x000000
    });

		this.fiil_rect = group.createWidget(widget.FILL_RECT, {
      x: 4,
      y: px(274),
      w: px(70)-8,
			h: 2,
      color: 0x000000
    });

    this.tMax = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(100),
      w: px(70),
      h: px(25),
      text_size: px(22),
      color: colorMax,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: tMax,
    });

    this.tMin = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(250),
      w: px(70),
      h: px(25),
      text_size: px(22),
      color: colorMin,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: tMin,
    });

    this.rain = group.createWidget(widget.TEXT, {
      x: 0,
      y: px(275),
      w: px(70),
      h: px(25),
      text_size: px(22),
			color: 0x3399ff,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.NONE,
      text: chanceOfRain + "%",
    });
	}
}

Page(BasePage({
  build() {
    logger.log(`build`);
    setScrollLock({ lock: true });
    setPageBrightTime({ brightTime: 60000 });

    let cityStr = "--";
    if (forecastJson != undefined && forecastJson != null) {
      if (forecastJson.city != undefined && forecastJson.city != null && forecastJson.city.length > 0) {
        cityStr = forecastJson.city;
        cityStr = cityStr.replace(cityStr[0], cityStr[0].toUpperCase());
      }
    }

	// City
    createWidget(widget.TEXT, {
			x: (DEVICE_WIDTH - px(210)) / 2,
			y: px(20),
			w: px(210),
			h: px(35),
			color: 0xffffff,
			text_size: px(24),
			align_h: align.CENTER_H,
			align_v: align.CENTER_V,
			text_style: text_style.NONE,
			text: cityStr,
    });
		// hint
		createWidget(widget.TEXT, {
			x: (DEVICE_WIDTH - px(330)) / 2,
			y: px(50),
			w: px(330),
			h: px(35),
			color: 0xffffff,
			text_size: px(20),
			align_h: align.CENTER_H,
			align_v: align.CENTER_V,
			text_style: text_style.NONE,
			text: getText("graf_hint"),
		});

		let forecastData = [];
		if (forecastJson && forecastJson.forecast) {
			for (let index = 0; index < 5; index++) {
        let dow_index = 0;
        let dateStr = "--";
        let icon = 'card/icon_0.png';
        let tempMinStr = "--";
        let tempMaxStr = "--";
        let chanceOfRainValue = "--";
				let forecastElement = {}

				if (index < forecastJson.forecast.length) {
					let forecast_element = forecastJson.forecast[index];
	        // logger.log(`forecast_element = ${JSON.stringify(forecast_element)}`);
	
	        //#region strings
	          
	        if (isFinite(forecast_element.weatherTime)) {
	          const weatherTime = new Date(forecast_element.weatherTime);
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
	          if (icon_index == 5 || icon_index == 9) {
	            if (forecast_element.cloudiness > 50) iconSrc += 'c';
	          }
	          bg_img = `card/bg${iconSrc}.png`;
	          icon = `card/icon${iconSrc}.png`;
	        }
					
	        if (isFinite(forecast_element.temperatureMin)) {
	          let temperature_unit = storage.getKey("temperature_unit", 0);
						forecastElement.low = forecast_element.temperatureMin;
	          let temperature = parseFloat(forecast_element.temperatureMin).toFixed(0);
	          if (temperature_unit == 1) {
	            temperature = CelsiusToFahrenheit(temperature);
	            tempMinStr = temperature + '°';
	          }
	          else tempMinStr = temperature + '°';
	          if (temperature > 0) tempMinStr = '+' + tempMinStr;
	        }
	        if (isFinite(forecast_element.temperatureMax)) {
	          let temperature_unit = storage.getKey("temperature_unit", 0);
						forecastElement.high = forecast_element.temperatureMax;
	          let temperature = parseFloat(forecast_element.temperatureMax).toFixed(0);
	          if (temperature_unit == 1) {
	            temperature = CelsiusToFahrenheit(temperature);
	            tempMaxStr = temperature + '°';
	          }
	          else tempMaxStr = temperature + '°';
	          if (temperature > 0) tempMaxStr = '+' + tempMaxStr;
	        }
	
	        if (isFinite(forecast_element.chanceOfRain)) {
	          chanceOfRainValue = parseInt(forecast_element.chanceOfRain);
						logger.log(`chanceOfRainValue = ${chanceOfRainValue}`);
	        }
	        //#endregion
	        
				}
				new Day(
					px(45) + index * px(80), 
					DEVICE_HEIGHT / 2 - px(150), 
					icon, 
					dow_index, 
					dateStr, 
					tempMaxStr, 
					tempMinStr, 
					chanceOfRainValue
				);
				forecastData.push(forecastElement);
			};
    }

		let group_ForecastWeather = createWidget(widget.GROUP, {
			x: px(80),
			y: DEVICE_HEIGHT / 2 - px(25),
			h: 0,
			w: 0,
		});
		canvas = group_ForecastWeather.createWidget(widget.CANVAS, {
			x: -5,
			y: 0,
			w: DEVICE_WIDTH,
			h: px(150),
		});
		weather_few_days(forecastData);

		// update time
		let timeStr = "";
		if (isFinite(forecastJson.weatherTime)) {
			const weatherTime = new Date(forecastJson.weatherTime);
			console.log(`weatherTime = ${weatherTime.toString()}`);
			const currentDateFormat = getDateFormat();
			if (currentDateFormat === DATE_FORMAT_DMY) {
				timeStr = weatherTime.getDate() + ' ' + getText('month_' + weatherTime.getMonth()) + ' ' + weatherTime.getFullYear();
			}
			else if (currentDateFormat === DATE_FORMAT_YMD || currentDateFormat === DATE_FORMAT_MDY) {
				timeStr = getText('month_' + weatherTime.getMonth()) + ', ' + weatherTime.getDate() + ', ' + weatherTime.getFullYear();
			}
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
		createWidget(widget.TEXT, {
			...TXT_FORECAST_TIME,
			text: timeStr,
		});

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
