require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer");
const PORT = process.env.PORT;
const app = express();
const cron = require("node-cron");
const cors = require("cors");

const https = require("https");
const axios = require("axios");
const chromium = require("chrome-aws-lambda");
const router = require("./controller");
const cookieParser = require("cookie-parser");
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(router);
app.use(cookieParser());

const { exec } = require("child_process");
const { log } = require("./config/logger");
const { User } = require("./contants/user");
const sendMsgTelegramByShellScrip = require("./service/telegram");
const { sequelize } = require("./models");
const {
  findScheduleByUid,
  updateSchedule,
  trumcateSchedule,
  clearShedule,
} = require("./service/schedule");

const connectDb = async () => {
  log.info("Checking database connection...");
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    log.info("Database connection established.");
  } catch (e) {
    log.info("Database connection failed", e);
    sendMsgTelegramByShellScrip("Database postgres connection failed");
    //process.exit(1);
  }
};

const sendMsgToTelegram = async (msg) => {
  const url =
    process.env.BASE_URL +
    process.env.TOKEN +
    `/sendmessage?chat_id=${process.env.CHAT_ID.toString()}&text=${msg.toString()}`;
  let uri = url.toString();
  return await axios.get(uri);
};

const checkInOut = async (user) => {
  const timeElapsed = Date.now();
  const today = new Date(timeElapsed);
  let IN_OR_OUT = "";
  const currentHours = today.getHours();

  let btnCheckInOut = "";
  let confirmCheckOut = "";
  if (currentHours == 9 || currentHours == 8 || currentHours == 7) {
    IN_OR_OUT = "in";
    btnCheckInOut = ".btn.btn-primary.btn-round.no-border.width-100.btn-sm";
  } else if (currentHours == 18 || currentHours == 17) {
    IN_OR_OUT = "out";
    btnCheckInOut = ".btn.btn-danger.btn-round.no-border.width-100.btn-sm";
    confirmCheckOut = ".btn.btn-sm.btn-primary";
  }
  log.info("calling to my bot telegram ...............");
  log.info("bot said :");

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: await chromium.executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.goto(process.env.URL);
    await delay(page);
    await page.waitForSelector("#log-userid");
    await page.focus("#log-userid");
    await page.type("#log-userid", user.id);

    // await autoScroll(page);
    await delay(page);

    const frameHandle = await page.$("iframe[id='iframeLoginPassword']");
    const frame = await frameHandle.contentFrame();
    await frame.type("input", user.pass);

    await page.waitForSelector("#btn-log");
    await page.click("#btn-log");

    await page.waitForSelector("#user-toggler");
    //.open-sidebar.han-sidebar-open
    await page.click("#user-toggler");

    await delay(page);

    if (btnCheckInOut) {
      await page.waitForSelector(btnCheckInOut);
      await page.click(btnCheckInOut);
      if(confirmCheckOut){
        await page.waitForSelector(confirmCheckOut);
        await page.click(confirmCheckOut);
      }
    }

    await delay(page);
    await browser.close();

    const msg = today
      .toUTCString()
      .concat(`\t${user.name} check ${IN_OR_OUT} sucess`);
    //sendMsgTelegramByShellScrip(msg.toString());
    sendMsgToTelegram(msg.toString());
    log.info(`${user.name} check ${IN_OR_OUT} sucess`);
  } catch (error) {
    const msg = today
      .toUTCString()
      .concat(`\t${user.name} check ${IN_OR_OUT} fail`);
    //sendMsgTelegramByShellScrip(msg);
    sendMsgToTelegram(msg);
    log.info(`${user.name} check ${IN_OR_OUT} fail`);
    log.info(error);
  }
};

const delay = async (page) => {
  await page.evaluate(async (time) => {
    await new Promise(function (resolve) {
      setTimeout(resolve, 4000);
    });
  });
};

const autoScroll = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
};

const randomIntFromInterval = (min, max) => {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};

(async () => {
  await connectDb();
  app.listen(PORT, async () => {
    let random30 = randomIntFromInterval(0, 25);
    let random60 = randomIntFromInterval(31, 55);
    log.info(`random30 : ${random30} random60 : ${random60}`);

    cron.schedule("0 * 2 1 * *", async () => {
      try {
        await trumcateSchedule();
      } catch (error) {
        log.error(error);
      }
    });

    cron.schedule(`0 ${random30},${random60} 7,8,17,18 * * 1-5`, async () => {
      const today = new Date(Date.now());
      const hours = today.getHours();
      const minutes = today.getMinutes();

      if (
        // (hours == "7" && Math.floor(minutes) < 30) ||
        (hours == "8" && Math.floor(minutes) > 30) ||
        // (hours == "18" && Math.floor(minutes) > 30) ||
        (hours == "17" && Math.floor(minutes) < 30)
      ) {
        return;
      }
      log.info(
        `\n++++++++++++++++++++++++++++++++++++++++ ${today.toDateString()} ${hours}:${minutes}:${today.getSeconds()} ++++++++++++++++++++++++++++++++++++++++`
      );
      log.info("Scheduler running ............");
      for (const user of User) {
        let isDayOff = false;
        try {
          const schedules = await findScheduleByUid(user.id);
          if (schedules.length > 0) {
            const schedule = schedules[0];
            let arr = schedule.dayOffs.split(/,| /);
            arr.includes(new Date().getDate().toString())
              ? (isDayOff = true)
              : (isDayOff = false);
            if (
              isDayOff &&
              (hours == "17" || hours == "18") &&
              arr.slice(1).length == 0
            ) {
              await clearShedule(schedule.userid);
            }
            if (
              isDayOff &&
              (hours == "17" || hours == "18") &&
              arr.slice(1).length > 0
            ) {
              log.info(`${user.name} offline today`);
              await updateSchedule(user.id, arr.slice(1).toString());
            }
          }
        } catch (error) {
          log.error(error);
        }
        if ((hours == "8" || hours == "17") && !isDayOff) {
          await checkInOut(user);
        }
        if (isDayOff) {
        }
      }

      log.info(".......................end job\n\n");
    });
    log.info("server is running with port : " + PORT);
    //for (const user of User)
    //  await checkInOut(user);
  });
})();
