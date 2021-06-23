const Settings = require(`../../models/settings.model`)
module.exports.run = async (client, message, args) =>{
    if (!args.length > 0) return await message.reply(`:x: NO PARAMS - Usage: \`${process.env.DISCORD_PREFIX}pm <start|stop>\` `)
    if (!message.author.hasPermission([`ADMINISTRATOR`])) return message.reply(`:no_entry: You do not have permission to do this.`)
    const settings = await Settings.findOne({ id: `settings` });
    switch (args[0]) {
        case `start`:
            if (!settings.paused) return await message.reply(`:warning: Priority Messages are not paused.`)
            settings.paused = false;
            settings.save();
            await message.reply(`:white_check_mark: Resumed Priority Messages`)
            break;
        case `stop`:
            if (settings.paused) return await message.reply(`:warning: Priority Messages are already paused.`)
            settings.paused = true;
            settings.save();
            await message.reply(`:white_check_mark: Paused Priority Messages`)
            break;
        default: 
            await message.reply(`:x: INVALID PARAMS - Usage: \`${process.env.DISCORD_PREFIX}pm <start|stop>\` `)
    }
};

module.exports.help = {
    name: `pm`
}