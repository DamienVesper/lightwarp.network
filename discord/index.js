const Discord = require('discord.js');
const log = require(`../utils/log.js`);
const fs = require(`fs`);
const path = require(`path`);
const client = new Discord.Client();

client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync(path.join(__dirname, `./commands`)).filter(file => file.endsWith(`.js`));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	log(`yellow`, `Loaded command ${command.help.name}`);
	client.commands.set(command.help.name, command);
}

client.on('ready', () => {
	log(`green`, `Logged in as ${client.user.tag}!`);
});

client.on('message', async message => {
	if (!message.content.startsWith(process.env.DISCORD_PREFIX) || message.author.bot) return;

	const args = message.content.slice(process.env.DISCORD_PREFIX.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (!client.commands.has(command)) return;

	try {
		client.commands.get(command).run(client, message, args);
	} catch (error) {
		log(`red`, error);
		await message.reply('there was an error trying to execute that command!');
	}
});

client.login(process.env.DISCORD_TOKEN);

module.exports;