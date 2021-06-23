const Settings = require(`../models/settings.model.js`);
const log = require(`./log.js`)

const initializeSettings = async () => {
    Settings.findOne({
        id: `settings`
    }).then(settings => {
        if (settings) return log(`green`, `Settings already initialized`);
        log(`yellow`, `Initializing settings in DB`)
        const newSettings = new Settings({
            paused: false
        })
        newSettings.save(() => {
            log(`green`, `Initialized settings in DB.`);
        })
    })

}

module.exports = initializeSettings;