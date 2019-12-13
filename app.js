const express = require("express");
const app = express();
const axios = require("axios");
const { map } = require("ramda");

const localConf = require("./local_conf.json");

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

app.listen(3000, () => {
  console.log("App started on port 3000");
});
