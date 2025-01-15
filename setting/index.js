import { gettext } from 'i18n'
// const logger = Logger.getLogger("*****message-setting");
const logger = console;

AppSettingsPage({
  state: { 
    data: { 
      Update_GPS: false, 
      latitude: 0, 
      longitude: 0 
    }, 
    props: {} 
  },
  
  build(props) {
    logger.log(`props = ${JSON.stringify(props)}`);
    const views = [];
    const context = this;
    setState(props);
    logger.log(`this.state = ${JSON.stringify(this.state)}`);

    if(this.state.data.Update_GPS) {
      getGPS_Position();
    }

    // function setItem() {
    //   logger.log(`setItem()`);
    //   logger.log(`data = ${JSON.stringify(context.state.data)}`);
    //   context.state.props.settingsStorage.setItem( "data", context.state.data );
    //   // this.alert(`data = ${JSON.stringify(context.state.data)}`);
    // }; 
    function setState(props) {
      logger.log(`setState()`);
      context.state.props = props;
      let item = props.settingsStorage.getItem("data");
      if (typeof item == 'string') item = JSON.parse(item);
      logger.log(`item = ${JSON.stringify(item)}`);
      if (item != null && item != undefined) context.state.data = item;
    }

    function getGPS_Position() {
      if ( !navigator) {
        logger.log("no navigator object");
        this.alert(gettext('gps_error'));
        return;
      }
      if (navigator && navigator.geolocation) {
        logger.log("geolocation supported");
        // logger.log("this = " + this);
        console.log("Is simulator:", isSimulator());
        // logger.log("this = " + Object.keys(this))
        const options = { enableHighAccuracy: false, timeout: 5e3, maximumAge: 30*60*1000 };
        navigator.geolocation.getCurrentPosition(
          (success) => {
            let coords = [success.coords.latitude, success.coords.longitude],
              coordsStr = `lat：${coords[0]}°，lng：${coords[1]}°`;
              logger.log(coordsStr);
              context.state.data = {};
              context.state.data.Update_GPS = false;
              context.state.data.latitude = coords[0];
              context.state.data.longitude = coords[1]
              // setItem();
              
              context.state.props.settingsStorage.setItem( "data", JSON.stringify(context.state.data) );
              // this.alert(JSON.stringify(context.state.data));
            },
            (err) => {
              logger.log("get location err, ", err.message);
              this.alert(gettext('gps_error'));
              
              context.state.data.Update_GPS = false;
              context.state.data.latitude = 0;
              context.state.data.longitude = 0;
              // setItem();
              context.state.props.settingsStorage.setItem( "data", JSON.stringify(context.state.data) );
            },
            options
        );

      } else {
        logger.log("geolocation not supported");

        context.state.data.Update_GPS = false;
        context.state.data.latitude = 0;
        context.state.data.longitude = 0;
        // setItem();
        context.state.props.settingsStorage.setItem( "data", JSON.stringify(context.state.data) );
      }
    };

    function isSimulator(){ 
      return navigator.deviceMemory > 1; 
    }
  
    function buildLayout(text, value, settingsKey, func) {
      const label = Text({
            style: {
              marginLeft : "15px",
              paddingRight: "15px",
              whiteSpace: "nowrap",
              flexShrink : "0"
            },
            align: "left",
          },
          text
      ),
      valueText = Text({
          style: {
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
            flexGrow: 1,
            textAlign: "right",
            paddingRight: "10px",
          },
          align: "right",
        },
        value
      ),
      view = View(
        {
          style: {
            overflow: "hidden",
            position: "absolute",
            top: "10px",
            right: "5px",
            background: "#3443dc",
            color: "white",
            fontSize: "15px",
            lineHeight: "30px",
            borderRadius: "30px",
            textAlign: "center",
            padding: "0 15px",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          },
        },
        [
          TextInput({
            label: "Edit",
            settingsKey: settingsKey,
            subStyle: {
              top: "0px",
              right: "0px",
              background: "#3443dc",
              color: "#3443dc",
              fontSize: "0px",
              lineHeight: "1px",
              borderRadius: "30px",
              textAlign: "center",
              padding: "0px",
            },
            onChange: (value) => {
              // func(value);
              logger.log(`onChange value = ${value}`);
            },
          }),
        ]
      );
      return View(
        {
          style: {
            position: "relative",
            marginTop: "5px",
            height: "50px",
            fontSize: "20px",
            lineHeight: "50px",
            color: "#333",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingRight : "65px",
        
          },
        },
        [label, valueText, view]
      );
    };

    let latitude = props.settingsStorage.getItem("latitude");
    let longitude = props.settingsStorage.getItem("longitude");
    let openWeather_APIkey = props.settingsStorage.getItem("OpenWeather_APIkey");
    let accuWeather_APIkey = props.settingsStorage.getItem("AccuWeather_APIkey");
    return (
      // широта
      views.push(
        buildLayout(
          gettext("latitude"),
          /*this.state.data.lat*/ latitude,
          "latitude",
          function (value) {
            logger.log(`value = ${value}`);
          }
        )
      ),
      // долгота
      views.push(
        buildLayout(
          gettext("longitude"),
          /*context.state.data.lng*/ longitude,
          "longitude",
          function (value) {
            // logger.log(`state = ${JSON.stringify(context.state)}`);
            // props.settingsStorage.setItem( "data", JSON.stringify(context.state.data) );
            logger.log(`value = ${value}`);
          }
        )
      ),
      // кнопка gps
      views.push(
        View(
          {
            style: {
              textAlign: "center",
              padding: "0 15px",
              marginTop: "15px",
              marginBottom: "5px",
            },
          },
          [
            Button({
              label: gettext("get_gps"),
              style: {
                background: "#3443dc",
                color: "white",
                borderRadius: "20px",
              },
              onClick: () => {
                // logger.log(`state = ${JSON.stringify(context.state)}`);
                getGPS_Position();
              },
            }),
          ]
        )
      ),
      // пояснение по настройке
      views.push(
        Text(
          {
            style: {
              textAlign: "center",
              padding: "0 5px",
              // marginTop: "15px",
              marginBottom: "15px",
              display: "block"
            },
            paragraph: "true",
          },
          gettext("gps_hint")
        )
      ),
      // разделитель
      views.push(
        View(
          {
            style: {
              overflow: "hidden",
              top: "10px",
              right: "5px",
              background: "#3443dc",
              color: "white",
              fontSize: "12px",
              lineHeight: "30px",
              padding: "0 15px",
              minHeight: "2px",
              marginBottom: "15px",
            },
          },
          []
        )
      ),
      // API Key
      views.push(
        // заголовок
        View(
          {
            style: {
              textAlign: "center",
              padding: "0 15px",
              marginTop: "15px",
              // marginBottom: "15px",
            },
          },
          [
            Text(
              {
                align: "center",
                style: {
                  textAlign: "center",
                },
              },
              "API Key*"
            ),
          ]
        )
      ),
      // OpenWeather
      views.push(
        buildLayout(
          "OpenWeather",
          openWeather_APIkey,
          "OpenWeather_APIkey",
          function (value) {
            logger.log(`value = ${value}`);
          }
        )
      ),
      // AccuWeather
      views.push(
        buildLayout(
          "AccuWeather",
          accuWeather_APIkey,
          "AccuWeather_APIkey",
          function (value) {
            logger.log(`value = ${value}`);
          }
        )
      ),
      // примечания apiKey_hint
      views.push(
        View(
          {
            style: {
              textIndent: "15px",
              textAlign: "left",
              padding: "0 5px",
              // marginTop: "15px",
              marginBottom: "15px",
            },
          },
          [
            Text(
              {
                align: "left",
                style: {
                  textAlign: "left",
                  display: "block"
                },
              },
              gettext("apiKey_hint")
            ),
            ///
            Text(
              {
                align: "left",
                style: {
                  textAlign: "left",
                  marginTop: "5px",
                  // marginRight: "5px",
                  // marginLeft: "15px",
                  display: "block"
                },
              },
              "OpenWeather"
            ),
            View(
              {},
              [
                Link(
                  {
                    source: "https://home.openweathermap.org/api_keys",
                  },
                  "https://home.openweathermap.org/api_keys"
                ),
              ]
            ),
            ///
            Text(
              {
                align: "left",
                style: {
                  textAlign: "left",
                  marginTop: "5px",
                  // marginRight: "5px",
                  // marginLeft: "30px",
                  display: "block"
                },
              },
              "AccuWeather"
            ),
            View(
              {},
              [
                Link(
                  {
                    source: "https://developer.accuweather.com/user/me/apps",
                  },
                  "https://developer.accuweather.com/user/me/apps"
                ),
              ]
            ),
          ]
        )
      ),
      // разделитель
      views.push(
        View(
          {
            style: {
              overflow: "hidden",
              top: "10px",
              right: "5px",
              background: "#3443dc",
              color: "white",
              fontSize: "12px",
              lineHeight: "30px",
              padding: "0 15px",
              minHeight: "2px",
              marginBottom: "15px",
            },
          },
          []
        )
      ),
      // ссылка на GitHub
      views.push(
        View(
          {
            style: {
              // textIndent: "15px",
              textAlign: "center",
              padding: "0 5px",
              marginTop: "15px",
              marginBottom: "15px",
            },
          },
          [
            Text(
              {
                // align: "left",
                style: {
                  textAlign: "center",
                  display: "block"
                },
              },
              gettext("GitHub_instruction")
            ),
            View(
              {},
              [
                Link(
                  {
                    source: gettext("GitHub_URL"),
                  },
                  gettext("GitHub_URL")
                ),
              ]
            ),
          ]
        )
      ),
      // разделитель
      views.push(
        View(
          {
            style: {
              overflow: "hidden",
              top: "10px",
              right: "5px",
              background: "#3443dc",
              color: "white",
              fontSize: "12px",
              lineHeight: "30px",
              padding: "0 15px",
              minHeight: "2px",
              marginBottom: "15px",
            },
          },
          []
        )
      ),
      // ссылка на Buy Me a Coffee
      views.push(
        View(
          {
            style: {
              // textIndent: "15px",
              textAlign: "center",
              padding: "0 5px",
              marginTop: "15px",
              marginBottom: "15px",
            },
          },
          [
            Text(
              {
                // align: "left",
                style: {
                  textAlign: "center",
                  display: "block",
                  marginBottom: "5px",
                },
              },
              gettext("Donate")
            ),
            Link(
              {
                source: "https://BuyMeaCoffee.com/SashaCX75",
              },
              "https://BuyMeaCoffee.com/SashaCX75"
            ),
            Image(
              {
                style: {
                  marginTop: "5px",
                  width: "300px",
                  height: "auto",
                },
                src: "data:image/png;base64,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",
              },
            ),
          ]
        )
      ),
      // разделитель
      views.push(
        View(
          {
            style: {
              overflow: "hidden",
              top: "10px",
              right: "5px",
              background: "#3443dc",
              color: "white",
              fontSize: "12px",
              lineHeight: "30px",
              padding: "0 15px",
              minHeight: "2px",
              marginBottom: "15px",
            },
          },
          []
        )
      ),
      // ссылка на Buy Me a Coffee
      views.push(
        View(
          {
            style: {
              // textIndent: "15px",
              textAlign: "center",
              padding: "0 5px",
              marginTop: "15px",
              marginBottom: "15px",
            },
          },
          [
            Text(
              {
                // align: "left",
                style: {
                  textAlign: "center",
                  display: "block",
                  marginBottom: "5px",
                },
              },
              gettext("contacts")
            ),
            Link(
              {
                source: "mailto:SashaCX75@gmail.com",
              },
              "e-mail: SashaCX75@gmail.com"
            ),
          ]
        )
      ),
      
      ////
      View(
        {
          style: {
            overflow: "hidden",
            position: "relative",
            width: "100%",
            // height: "100vh",
            backgroundColor: "#EDEDED",
            // width: "fit-content",
            height: "100%",
            display: "block",
          },
        },
        views
      )
    );
  },
  
});