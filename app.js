const express = require("express");
const axios = require("axios");
const { map, find } = require("ramda");

const log = console.log;
const app = express();

const localConf = require("./local_conf.json");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Global mutatable data below, spooky
var vaxhomRindo = [];
var rindoVaxholm = [];
var rindoVarmdo = [];
var varmdoRindo = [];

app.get("/", (req, res) => {
  res.send("Future landingpage");
});

app.post("/vaxholm-rindo/next", (req, res) => {
  const next = findNext(Number(req.body.timestamp), vaxhomRindo);
  res.status(next.code).send(next.result);
});

app.post("/rindo-vaxholm/next", (req, res) => {
  const next = findNext(Number(req.body.timestamp), rindoVaxholm);
  res.status(next.code).send(next.result);
});

app.post("/rindo-varmdo/next", (req, res) => {
  const next = findNext(Number(req.body.timestamp), rindoVarmdo);
  res.status(next.code).send(next.result);
});

app.post("/varmdo-rindo/next", (req, res) => {
  const next = findNext(Number(req.body.timestamp), varmdoRindo);
  res.status(next.code).send(next.result);
});

app.listen(3000, async () => {
  syncToApi();
  const syncInterval = setInterval(syncToApi, 3600000);
});

const findNext = (timestamp, list) => {
  if (timestamp) {
    if (timestamp !== NaN) {
      const next = find(x => x > req.body.timeStamp)(list);
      if (next) {
        return { code: 200, result: next };
      } else {
        return { code: 404, result: "Couldnt find mathcing departure" };
      }
    } else {
      return { code: 400, result: "Timestamp needs to be a number" };
    }
  } else {
    return { code: 400, result: "Timestamp needs to exsist" };
  }
};

const getDepartures = async ({ limit = 200, routeName, harbour }) => {
  const requestBody = `
                          <REQUEST>
                          <LOGIN authenticationkey="${localConf.TrafikAPIKey}" />
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

const getTravelTime = async (start, finish) => {
  const template = `
      http://dev.virtualearth.net/REST/v1/Routes?wayPoint.1=${start}&waypoint.2=${finish}&maxSolutions=1&key=${localConf.BingAPIKey}&routeAttributes=routeSummariesOnly
      `;
  const result = await axios.get(template);

  return (
    result["errorDetails"] ||
    result["resourceSets"]["resources"][0]["travelDuration"]
  );
};

const toEpoch = depatureList =>
  map(item => new Date(item["DepartureTime"]).getTime())(depatureList);

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

  log("Sync for Värmdö to Rindö");
  varmdoRindo = toEpoch(
    await getDepartures({ routeName: "Oxdjupsleden", harbour: "Värmdö" })
  );

  log("Finished sync");
};
