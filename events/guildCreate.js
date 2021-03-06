module.exports = async (client, guild) => {
    // Get the default config settings
    const defSet = client.config.defaultSettings;

    const exists = await client.database.models.settings.findOne({where: {guildID: guild.id}})
        .then(token => token !== null)
        .then(isUnique => isUnique);

    if (!exists) {
        // Adding a new row to the DB
        client.database.models.settings.create({
            guildID: guild.id,
            adminRole: defSet.adminRole,
            enableWelcome: defSet.enableWelcome,
            welcomeMessage: defSet.welcomeMessage,
            useEmbeds: defSet.useEmbeds,
            timezone: defSet.timezone,
            announceChan: defSet.announceChan,
            useEventPages: defSet.useEventPages,
            language: defSet.language
        })
            .then(() => {
                // Log that it joined another guild
                client.log("GuildCreate", `I joined ${guild.name}(${guild.id})`, "Log", "diff", "+");
            })
            .catch(error => { console.log(error, guild.id); });
        // Messages the guild owner to tell the how to set the bot up  (Missing a ton/ not sure if it's really needed)
//         try {
//             guild.owner.send(`Thank you for adding this SWGoHBot! Before using me, please configure the Admin role by running the following command:
// \`${client.config.prefix}setconf adminRole add <AdminRoleName>\`.
// This will allow anyone with that Discord role to edit the bot's settings.
// Also run \`${client.config.prefix}setconf timezone <timezone>\` to be the timezone of your guild's activities (Default is \`America/Los_Angeles\`), and run \`${client.config.prefix}setconf announceChan <AnnouncementChannel>\` if you want to use the events/ announcements or event commands.
// After that, you should be set to begin using SWGoHBot!`);
//         } catch (e) {
//             console.error("Broke trying to send guildCreate message: " + e);
//         }
    } else {
        // Log that it joined another guild (Again)
        client.log("GuildCreate", `I re-joined ${guild.name}(${guild.id})`, "Log", "diff", "+");
    }
};

