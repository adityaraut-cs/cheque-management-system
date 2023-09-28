import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs'
import dotenv from 'dotenv';
import routes from './Routes/routes.js';
import logger from './UtilityFunctions/logger/loggger.js';
import { getOracleConnection } from "./UtilityFunctions/db/dbutils.js";
import { getRabbitMQConnection } from "./UtilityFunctions/mq/rabbitMq.js";
let dbconfig = fs.readFileSync('./dbconfig.json', 'utf8')
dbconfig = JSON.parse(dbconfig);

global.config = dbconfig;
global.logger = logger;
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;


(async () => {
  const oracleConnectionSuccess = await validateOracleConnection();
  const rabbitMQConnectionSuccess = await validateRabbitMQConnection();

  if (!oracleConnectionSuccess || !rabbitMQConnectionSuccess) {
    logger.error('Failed to Establish One or More Connections. Server not started. Please Check Configuration');
    return;
  }

  app.use(bodyParser.json());
  app.use('/payments', validateSessionId);
  app.use('/payments', routes);

  app.listen(port, () => {
    logger.info(`Server: Listening on Port: ${port}`);
  });
})();


async function validateOracleConnection() {
  let connection;
  try {
    connection = await getOracleConnection();
    if (connection) {
      logger.info(`Oracle : Successfully Connected`);
      await connection.close();
    }
    return true;
  } catch (error) {
    logger.error('Error Connecting to Oracle DB: ', error);
    return false;
  };
}

async function validateRabbitMQConnection() {
  let connection;
  try {
    connection = await getRabbitMQConnection();
    if (connection) {
      logger.info('RabbitMQ: Successfully Connected');
      await connection.close();
    }
    return true;
  } catch (error) {
    logger.error('Error Connecting to RabbitMQ:', error);
    return false;
  };
};

async function validateSessionId(req, res, next) {
  let connection, result;
  const sessionid = req.headers['sessionid'];
  req.body.user_id = sessionid;
  if (!sessionid) {
    res.status(400).json({ error: 'No Session ID Provided.' });
    return;
  };
  connection = await getOracleConnection();

  result = await connection.execute('select user_id from iwz_user_master where user_id = :sessionid', {sessionid})
  if (sessionid === result.rows[0][0]) {
    next();
  } else {
    res.status(403).json({ error: 'You Do Not Have Permission.' });
  };
};