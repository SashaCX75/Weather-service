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
        // logger.log("this = " + Object.keys(this));
        // logger.log(`this = ${this}`);
        // logger.log(`location = ${this.location}`);
        // logger.log(`location = ${JSON.stringify(this.location)}`);
        // this.alert(`location = ${this.location}`);
        // this.alert(`location = ${JSON.stringify(this.location)}`);
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

        /////
        
        // context.state.data.lat = 50;
        // context.state.data.lng = 30;
        // logger.log(`context.state.data = ${JSON.stringify(context.state.data)}`);
        // setItem();

        // context.state.props.settingsStorage.setItem( "latitude", 50 );
        // context.state.props.settingsStorage.setItem( "longitude", 30 );

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
      // примечания
      views.push(
        View(
          {
            style: {
              textIndent: "15px",
              textAlign: "left",
              padding: "0 5px",
              // marginTop: "15px",
              // marginBottom: "15px",
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
      
      ////
      View(
        {
          style: {
            overflow: "hidden",
            position: "relative",
            width: "100%",
            height: "100vh",
            backgroundColor: "#EDEDED",
          },
        },
        views
      )
    );
  },
  
});