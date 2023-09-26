import chalk from 'chalk';
const { connect } = await import('amqplib');
let channel;

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

        if (connection) {
            console.log('RabbitMQ : ' + chalk.green('Successfully Connected'));
        }
        return connection;
    } catch (error) {
        console.error(chalk.red('ERROR Connecting to RabbitMQ:'), error);
    };
};

export async function sendToMq(msg, key, exchange = config.rabbitmq.exchange) {
    try {
        let conn = await getRabbitMQConnection();
        channel = await conn.createChannel();
        await channel.assertExchange(exchange, "topic", { durable: true })
        await channel.publish(exchange, key, Buffer.from(JSON.stringify(msg)));
        console.log(`Publishing Message To Exchange: ${exchange} with Key: ${key} and Message: ${JSON.stringify(msg)}`)
        return null
    } catch (error) {
        console.log("ERROR In sendToMq" + error.stack);
    }
}