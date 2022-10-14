const express = require("express"),
  app = express();
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));

const fs = require("fs"); // Or `import fs from "fs";` with ESM

let shootJob = {
  isRunning: false,
  pendingList: [],
  render: async function () {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("Render start ");
    console.log("Pendding is: " + JSON.stringify(this.pendingList));
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
    });

    do {
      let list = [...this.pendingList]; //copy
      this.pendingList = [];
      console.log("Pendding is: " + JSON.stringify(this.pendingList));
      console.log("List is: " + JSON.stringify(list));
      for (let i = 0; i < list.length; i++) {
        let tokenId = list[i];
        console.log("Start:  " + tokenId);
        let fileTokenPathToSave =
          __dirname + "/public/estate/" + tokenId + ".png";

        const page = await browser.newPage();
        await page.setViewport({ width: 500, height: 500 });

        await page.goto("https://klay.metaearth.sbs/estate-view?id=" + tokenId);
        console.log("Page loading:  " + tokenId);
        // await delay(20000);
        await page.waitForSelector("#is-renderred");
        console.log("Page is renderred");

        await page.screenshot({
          path: fileTokenPathToSave,
        });
        console.log("TokenID " + tokenId + " is saved");
      }
    } while (this.pendingList.length > 0);

    await browser.close();

    this.isRunning = false;
  },
};

const timeStart = new Date();
const puppeteer = require("puppeteer");
var bodyParser = require("body-parser");

app.use(bodyParser.json());
var cors = require("cors");
app.use(cors());

app.get("/", async (req, res) => {
  res.send("MetaEarth Data Server KLAY 1.0 start in " + timeStart);
});

app.get("/shoot", async (req, res) => {
  try {
    let fileTokenPath =
      __dirname + "/public/estate/" + req.query.tokenId + ".png";
    if (fs.existsSync(fileTokenPath) && !req.query.live) {
      res.sendFile(fileTokenPath);
      console.log("TOken " + fileTokenPath + " is found => Send");
    } else {
      if (shootJob.pendingList.indexOf(req.query.tokenId) > -1) {
        console.log(
          "Token " + req.query.tokenId + " is in job list. Not add render job"
        );
      } else {
        shootJob.pendingList.push(req.query.tokenId);
        console.log(
          "TOken " + fileTokenPath + " is not found => Add render job"
        );
      }
      res.sendFile(__dirname + "/public/estate/loading.png");
      await shootJob.render();
    }
  } catch (error) {
    console.log(error);
  }
});

app.get("/uri", async (req, res) => {
  try {
    let tokenName = "MetaEarth Land";
    let tokenTiles = "List tiles";
    let tokenImg =
      "https://data-klay.metaearth.sbs/shoot?tokenId=" + req.query.tokenId;
    let metaData = {
      title: "MetaEarth Land Metadata",
      type: "land",
      properties: {
        name: {
          type: "string",
          description: tokenName,
        },
        tiles: {
          type: "string",
          description: tokenTiles,
        },
        image: {
          type: "string",
          description: tokenImg,
        },
      },
    };
    res.send(JSON.stringify(metaData));
  } catch (error) {
    console.log(error);
  }
});
app.use(express.static("public"));

const Web3 = require("web3");
const web3 = new Web3("https://api.baobab.klaytn.net:8651/");
let abi = [
  {
    constant: true,
    inputs: [
      {
        name: "_tokenId",
        type: "uint256",
      },
    ],
    name: "ownerOf",
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];
let mest = new web3.eth.Contract(
  abi,
  "0x5c859e6e6896bf44d68F195cBF759657BEA476fc"
);

app.post("/vrupload", async (req, res) => {
  console.log(req.body); // your JSON
  let sender = web3.eth.accounts.recover(
    req.body.textToSign,
    req.body.signature
  );
  let tokenId = req.body.tokenId;
  let owner = await mest.methods.ownerOf(tokenId).call();

  if (sender === owner) {
    fs.writeFileSync(
      __dirname + "/public/vr/" + req.body.tokenId + ".json",
      JSON.stringify({ location: req.body.location, content: req.body.content })
    );
    res.send({ msg: "Saved", status: "success" });
  } else {
    res.send({ msg: "Not Saved", status: "error" });
  }
});

app.get("/vrget", async (req, res) => {
  let fileTokenPath = __dirname + "/public/vr/" + req.query.tokenId + ".json";

  fs.access(fileTokenPath, fs.F_OK, (err) => {
    if (err) {
      console.error(err);
      res.send({ result: "Token has no content" });
    }
    let getData = JSON.parse(fs.readFileSync(fileTokenPath, "utf8"));

    res.send(getData);
  });
});

app.get("/allvrid", async (req, res) => {
  let fileTokenPath = __dirname + "/public/vr/";
  let listToken = [];
  fs.readdir(fileTokenPath, function (err, filenames) {
    if (err) {
      res.send("Error");
    }
    for (let i = 0; i < filenames.length; i++) {
      listToken.push({ id: filenames[i].replace(/\.[^/.]+$/, "") });
    }
    res.send(listToken);
  });
});

app.get("/allvr", async (req, res) => {
  let fileTokenPath = __dirname + "/public/vr/";
  let listToken = [];
  fs.readdir(fileTokenPath, function (err, filenames) {
    if (err) {
      res.send("Error");
    }
    for (let i = 0; i < filenames.length; i++) {
      let fileData = JSON.parse(
        fs.readFileSync(fileTokenPath + "/" + filenames[i])
      );
      listToken.push({
        id: filenames[i].replace(/\.[^/.]+$/, ""),
        ...fileData,
      });
    }
    res.send(listToken);
  });
});

app.get("/tokenvr", async (req, res) => {
  let fileTokenPath = __dirname + "/public/vr/" + req.query.tokenId + ".json";

  fs.access(fileTokenPath, fs.F_OK, (err) => {
    if (err) {
      console.error(err);
      res.send({ result: "Token has no content" });
    }
    let getData = JSON.parse(fs.readFileSync(fileTokenPath, "utf8"));

    res.render("tokenvr", { src: getData.content[0].data });
  });
});
app.get("/geovr", async (req, res) => {
  let fileTokenPath = __dirname + "/public/vr/";
  let listToken = [];
  fs.readdir(fileTokenPath, function (err, filenames) {
    if (err) {
      res.send("Error");
    }
    for (let i = 0; i < filenames.length; i++) {
      let fileData = JSON.parse(
        fs.readFileSync(fileTokenPath + "/" + filenames[i])
      );
      listToken.push({
        id: filenames[i].replace(/\.[^/.]+$/, ""),
        ...fileData,
      });
    }
    res.render("geoar", { tokens: listToken });
  });
});
var listener = app.listen(process.env.PORT, function () {
  console.log("API app is listening on port " + listener.address().port);
});
