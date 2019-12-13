const express = require("express");
const axios = require("axios");
const { map } = require("ramda");

const log = console.log;
const app = express();

const localConf = require("./local_conf.json");

//Global mutatable data below, spooky
var vaxhomRindo = [];
var rindoVaxholm = [];
var rindoVarmdo = [];
var varmdoRindo = [];

const getDepartures = async ({ limit = 200, routeName, harbour }) => {
  const requestBody = `
                        <REQUEST>
                        <LOGIN authenticationkey="${localConf.APIKey}" />
                        <QUERY limit="${limit}" objecttype="FerryAnnouncement" schemaversion="1.2" orderby="DepartureTime">
                            <FILTER>
                            <EQ name="Route.Name" value="${routeName}" />
                            <EQ name="FromHarbor.Name" value="${harbour}" />
                            <GT name="DepartureTime" value="$now" />
                            </FILTER>
                            <INCLUDE>DepartureTime</INCLUDE>
                        </QUERY>
                        </REQUEST>
                        `;

  const result = await axios.post(
    "https://api.trafikinfo.trafikverket.se/v2/data.json",
    requestBody,
    { headers: { "Content-Type": "text/plain" } }
  );

  return result.data["RESPONSE"]["RESULT"][0]["FerryAnnouncement"];
};

const toEpoch = depatureList =>
  map(item => new Date(item["DepartureTime"]).getTime())(depatureList);

app.get("/", (req, res) => {
  res.send("welcome");
});

app.get("/RindoVaxholm", async (req, res) => {
  res.send(
    toEpoch(
      await getDepartures({ routeName: "VaxholmsLeden", harbour: "Rindö" })
    )
  );
});

app.listen(3000, async () => {
    syncToApi();
    const syncInterval = setInterval(syncToApi, 3600000)
});

const syncToApi = async () => {
    log("Sync for Vaxholm to Rindö started");
    vaxhomRindo = toEpoch(
      await getDepartures({ routeName: "VaxholmsLeden", harbour: "Vaxholm" })
    );

    log("Sync for Rindö to Vaxholm");
    rindoVaxholm = toEpoch(
      await getDepartures({ routeName: "VaxholmsLeden", harbour: "Rindö" })
    );

    log("Sync for Rindö to Värmdö");
    rindoVarmdo = toEpoch(
      await getDepartures({ routeName: "Oxdjupsleden", harbour: "Rindö" })
    );

    log("Sync for Rindö to Värmdö");
    varmdoRindo = toEpoch(
      await getDepartures({ routeName: "Oxdjupsleden", harbour: "Värmdö" })
    );

    log('Finished sync');
}
