import { createWidget, widget, prop, align, text_style } from '@zos/ui'
import { px } from "@zos/utils";
import { getDeviceInfo } from '@zos/device'

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT  } = getDeviceInfo();

export const BTN_SETTINGS = {
  x: (DEVICE_WIDTH - px(60)) / 2,
  y: DEVICE_HEIGHT - px(60),
  w: px(60),
  h: px(60),
  normal_src: 'settings.png',
  press_src: 'settings.png',
}

export const BTN_INFO = {
  x: px(40),
  y: DEVICE_HEIGHT - px(140),
  w: px(60),
  h: px(60),
  normal_src: 'info.png',
  press_src: 'info.png',
}

export const BTN_CHART = {
  x: DEVICE_WIDTH - px(100),
  y: DEVICE_HEIGHT - px(140),
  w: px(60),
  h: px(60),
  normal_src: 'chart.png',
  press_src: 'chart.png',
}

export const BTN_BACK = {
  x: DEVICE_WIDTH / 2 - px(27),
  y: DEVICE_HEIGHT - px(60),
  w: px(60),
  h: px(60),
  normal_src: "arrow_left.png",
  press_src: "arrow_left.png",
}

let btn_width = 350;
let btn_hight = 50;
let btn_radius = 15;
let btn_border = 3;
let group_width = 340;
// let group_width = btn_width;

//#region BTN style
export const BTN_BORDER_BLUE = {
  x: (DEVICE_WIDTH - px(btn_width) - 2*btn_border) / 2,
  y: px(300) - btn_border,
  w: px(btn_width) + 2*btn_border,
  h: px(btn_hight) + 2*btn_border,
  radius: btn_radius + btn_border,
  line_width: btn_border,
  color: 0x2020c7
}
export const BTN_BLUE = {
  x: (DEVICE_WIDTH - px(btn_width)) / 2,
  y: px(300),
  w: px(btn_width),
  h: px(btn_hight),
  text_size: px(30),
  color: 0xffffff,
  radius: btn_radius,
  normal_color: 0x3443dc,
  press_color: 0x3472ff,
}

export const BTN_BORDER_GREEN = {
  x: (DEVICE_WIDTH - px(btn_width) - 2*btn_border) / 2,
  y: px(300) - btn_border,
  w: px(btn_width) + 2*btn_border,
  h: px(btn_hight) + 2*btn_border,
  radius: btn_radius + btn_border,
  line_width: btn_border,
  color: 0x1D841D
}
export const BTN_GREEN = {
  x: (DEVICE_WIDTH - px(btn_width)) / 2,
  y: px(300),
  w: px(btn_width),
  h: px(btn_hight),
  text_size: px(30),
  color: 0xffffff,
  radius: btn_radius,
  normal_color: 0x43ad32,
  press_color: 0x6ad830,
}
//#endregion 

//#region INFO_GROUP
export const INFO_GROUP_STYLE = {
  x: DEVICE_WIDTH / 2 - px(group_width / 2),
  w: px(group_width),
  h: px(100),
}

export const INFO_GROUP_TEXT_STYLE = {
  x: 0,
  y: 0,
  w: px(group_width),
  h: px(36),
  color: 0xa0a0a0,
  text_size: px(26),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.WRAP,
}

export const INFO_GROUP_TEXT_SECOND_STYLE = {
  x: 10,
  y: px(36),
  w: px(group_width) - 20,
  h: px(44),
  color: 0xffffff,
  text_size: px(30),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.WRAP,
}

export const INFO_GROUP_TEXT_BORDER_STYLE = {
  x: 0,
  y: px(36),
  w: px(group_width),
  h: px(44),
  radius: px(15),
  line_width: 2,
  color: 0xa0a0a0,
}

//#endregion

//#region RADIO_BUTTON
export const RADIO_BUTTON_STYLE = {
  x: px(60),
  // y: 0,
  w: px(60),
  h: px(60)
}

export const SMALL_SUB_GROUP_STYLE = {
  x: (DEVICE_WIDTH - group_width) / 2,
  // y: 0,
  w: px(group_width),
  h: px(80),
  radius: px(25),
  line_width: 3,
  color: 0x313131
}

// export const RADIO_BUTTON_ICON_STYLE = {
//   x: px(125),
//   // y: 0,
//   w: px(60),
//   h: px(80),
// }

export const RADIO_BUTTON_TEXT_STYLE = {
  x: px(160),
  // y: 0,
  w: px(265),
  h: px(80),
  color: 0xffffff,
  text_size: px(30),
  align_h: align.LEFT,
  align_v: align.CENTER_V,
  text_style: text_style.NONE,
}
//#endregion

//#region данные

export const TXT_CITY = {
  x: (DEVICE_WIDTH - px(210)) / 2,
  y: px(25),
  w: px(210),
  h: px(40),
  color: 0xffffff,
  text_size: px(30),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.NONE
}

export const TXT_DISTRICT = {
  x: (DEVICE_WIDTH - px(290)) / 2,
  y: px(55),
  w: px(290),
  h: px(30),
  color: 0xffffff,
  text_size: px(20),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.NONE,
}

export const TXT_TEMPERATURE = {
  x: (DEVICE_WIDTH - px(280)) / 2,
  y: px(80),
  w: px(280),
  h: px(64),
  color: 0xffffff,
  text_size: px(58),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.NONE,
}

export const TXT_WEATHER_DESCRIPTION = {
  x: (DEVICE_WIDTH - px(420)) / 2,
  y: px(135),
  w: px(420),
  h: px(40),
  color: 0xffffff,
  text_size: px(30),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.NONE,
}

export const TXT_WEATHER_TIME = {
  x: (DEVICE_WIDTH - px(420)) / 2,
  y: px(170),
  w: px(420),
  h: px(30),
  color: 0xffffff,
  text_size: px(20),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.NONE,
}

export const NOTIF_OFFSET_Y = px(210);

export const TXT_FORECAST_TIME = {
  x: (DEVICE_WIDTH - px(330)) / 2,
  y: DEVICE_HEIGHT / 2 + px(150),
  w: px(330),
  h: px(35),
  color: 0xffffff,
  text_size: px(20),
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.NONE,
}
//#endregion
