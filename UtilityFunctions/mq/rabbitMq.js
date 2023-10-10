import chalk from 'chalk';
const { connect } = await import('amqplib');
import logger from '../logger/loggger.js'

export async function getRabbitMQConnection() {
    let connection;
    try {
        connection = await connect({
            protocol: 'amqp',
            hostname: config.rabbitmq.serverip,
            port: 5672,
            username: config.rabbitmq.user,
            password: config.rabbitmq.password,
            locale: 'en_US',
            frameMax: 0,
            heartbeat: 0,
            vhost: '/'
        });

        if (!connection) {
            logger.error("Error: RabbitMQ Connection Not Initialized")
        }
        return connection;
    } catch (error) {
        logger.error(chalk.red('ERROR Connecting to RabbitMQ:'), error);
    };
};

export async function sendToMq(msg, key, exchange = config.rabbitmq.exchange) {
    let conn, channel;
    try {
        conn = await getRabbitMQConnection();
        channel = await conn.createChannel();
        await channel.assertExchange(exchange, "topic", { durable: true })
        await channel.publish(exchange, key, Buffer.from(JSON.stringify(msg)));
        logger.info(`Publishing Message To Exchange: ${exchange} with Routing Key: ${key} and Message: ${JSON.stringify(msg)}`);
    } catch (error) {
        logger.error("ERROR In sendToMq" + error.stack);
    } finally {
        channel.close();
        conn.close();
    }
}