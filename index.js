// index.js

import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import dotenv from 'dotenv';
import routes from './Routes/routes.js';
import chalk from 'chalk';
// import { logger } from './UtilityFunctions/logger/loggger.js'
import { getOracleConnection } from "./UtilityFunctions/db/dbutils.js";
import { getRabbitMQConnection } from "./UtilityFunctions/mq/rabbitMq.js";
const config = JSON.parse(fs.readFileSync('./dbconfig.json', 'utf-8'));

global.config = config;
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
// logger.info("Logger Working")
async function validateOracleConnection() {
  try {
    const connection = await getOracleConnection();
    if (connection) {
      console.log(`Oracle : ${chalk.green(`Successfully Connected`)} `);
      await connection.close();
    }
    return true;
  } catch (error) {
    console.error('Error Connecting to Oracle DB: ', error);
    return false;
  }
}

async function validateRabbitMQConnection() {
  try {
    // Attempt to establish a RabbitMQ connection
    const connection = await getRabbitMQConnection();
    await connection.close();
    return true;
  } catch (error) {
    console.error('Error Connecting to RabbitMQ:', error);
    return false;
  }
}

function validateSessionId(req, res, next) {
  const sessionId = req.headers['sessionid'];
  if (!sessionId) {
    res.status(400).json({ error: 'No Session ID Provided.' });
    return;
  };
  if (sessionId === process.env.SESSIONID) {
    next();
  } else {
    res.status(403).json({ error: 'You Do Not Have Permission.' });
  };
};


(async () => {
  const oracleConnectionSuccess = await validateOracleConnection();
  const rabbitMQConnectionSuccess = await validateRabbitMQConnection();

  if (!oracleConnectionSuccess || !rabbitMQConnectionSuccess) {
    console.error('Failed to Establish One or More Connections. Server not started. Please Check Configuration');
    return;
  }

  app.use(bodyParser.json());
  app.use('/payments', validateSessionId);
  app.use('/payments', routes);

  app.listen(port, () => {
    console.log(`Server: Listening on Port ${chalk.green(`${port}`)}`);
  });
})();
