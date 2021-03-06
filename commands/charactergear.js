const Command = require("../base/Command");

class Charactergear extends Command {
    constructor(client) {
        super(client, {
            name: "charactergear",
            category: "Star Wars",
            aliases: ["chargear", "gear"]
        });
    }

    async run(client, message, [userID, ...searchChar]) {
        let gearLvl = 0;
        // If there's enough elements in searchChar, and it's in the format of a number*
        if (searchChar.length > 0 && !isNaN(parseInt(searchChar[searchChar.length-1]))) {                                                                                               
            gearLvl = parseInt(searchChar.pop());
            if (gearLvl < 0 || gearLvl > 7) {
                return message.channel.send(message.language.get("COMMAND_GUILDSEARCH_BAD_STAR"));
            }   
        }  

        // Need to get the allycode from the db, then use that
        if (!userID) {
            return message.channel.send(message.language.get("BASE_SWGOH_MISSING_CHAR"));
        } else if (userID !== "me" && !client.isAllyCode(userID) && !client.isUserID(userID)) {
            // If they're just looking for a character for themselves, get the char
            searchChar = userID + " " + searchChar;
            searchChar = searchChar.trim();
            userID = null;
        } 
        if (userID) {
            const allyCodes = await client.getAllyCode(message, userID);
            if (!allyCodes.length) {
                return message.channel.send(message.language.get("BASE_SWGOH_NO_ALLY", message.guildSettings.prefix));
            } else if (allyCodes.length > 1) {
                return message.channel.send("Found " + allyCodes.length + " matches. Please try being more specific");
            }
            userID = allyCodes[0];
        }

        if (Array.isArray(searchChar)) {
            searchChar = searchChar.join(" ");
        }
 
        if (!searchChar || !searchChar.length) {
            return message.channel.send(message.language.get("BASE_SWGOH_MISSING_CHAR"));
        }
        const chars = client.findChar(searchChar, client.characters);
 
        let character;
        if (chars.length === 0) {
            return message.channel.send(message.language.get("BASE_SWGOH_NO_CHAR_FOUND", searchChar));
        } else if (chars.length > 1) {
            const charL = [];
            const charS = chars.sort((p, c) => p.name > c.name ? 1 : -1);
            charS.forEach(c => {
                charL.push(c.name);
            });
            return message.channel.send(message.language.get("BASE_SWGOH_CHAR_LIST", charL.join("\n")));
        } else {                                                                                                                                                                        
            character = chars[0];
        }

        // The current max possible gear level
        const MAX_GEAR = 12;

        if (!userID) {
            // Figure out where the gear level is in the command, and grab it
            if (gearLvl) {
                if (gearLvl < 1 || gearLvl > MAX_GEAR || isNaN(gearLvl) ) {
                    gearLvl = "";
                } else {
                    // There is a valid gear level being requested
                    gearLvl = "Gear " + gearLvl;
                }
            } else {
                gearLvl = "";
            }

            if (!gearLvl.length) {
                const allGear = {};

                for (var level in character.gear) {
                    const thisLvl = character.gear[level];
                    for (var ix = 0; ix < thisLvl.length; ix++) {
                        if (!allGear[thisLvl[ix]]) { // If it's not been checked yet
                            allGear[thisLvl[ix]] = 1;
                        } else { // It's already in there
                            allGear[thisLvl[ix]] = allGear[thisLvl[ix]] + 1;
                        }
                    }
                }

                let gearString = "";
                for (var key in allGear) {
                    gearString += `* ${allGear[key]}x ${key}\n`;
                }
                message.channel.send(message.language.get("COMMAND_CHARGEAR_GEAR_ALL", character.name, gearString), {
                    code: "md",
                    split: true
                });
            } else {
                // Format and send the requested data back
                chars.forEach(character => {
                    const thisGear = character.gear[gearLvl];
                    message.channel.send({
                        embed: {
                            "color": `${character.side === "light" ? 0x5114e0 : 0xe01414}`,
                            "author": {
                                "name": character.name,
                                "url": character.url,
                                "icon_url": character.avatarURL
                            },
                            "fields": [{
                                "name": gearLvl,
                                "value": `* ${thisGear.length > 0 ? thisGear.join("\n* ") : message.language.get("COMMAND_CHARGEAR_GEAR_NA")}`
                            }]
                        }
                    });
                });
            }
        } else {
            // Looking for a player's remaining needed gear
            const player = await client.swgohAPI.player(userID);
            const char = await client.swgohAPI.getCharacter(character.uniqueName);
            const playerChar = player.roster.find(c => c.defId === character.uniqueName);

            if (!playerChar) {
                // They don't have it unlocked, so send the whole list
                
            } else {
                // They do have the character unlocked.
                // Need to filter out the gear that they already have assigned to the character, then show them what's left

                const gearList = char.unitTierList.filter(t => t.tier >= playerChar.gear);
                console.log(gearList);

                const fields = [];
                gearList.forEach((g, ix) => {
                    // Take out any that are already equipped
                    if (g.tier === playerChar.gear) {
                        const toRemove = playerChar.equipped.map(eq => eq.slot);
                        while (toRemove.length) {
                            g.equipmentSetList.splice(toRemove.pop(), 1);
                        }
                    }
                    // Take out the unknown ones
                    if (g.equipmentSetList.indexOf("???????") > -1) {
                        g.equipmentSetList.splice(g.equipmentSetList.indexOf("???????"), 1);
                    }
                    if (g.tier === 12 && ix === 0 && g.equipmentSetList.length === 0) {
                        fields.push({
                            name: "Congrats!",
                            value: "Look like you have the gear maxed out for " + character.name
                        });
                    } else {
                        fields.push({
                            name: `Gear Lvl ${g.tier}`,
                            value: g.equipmentSetList.join("\n")
                        });
                    }
                });
                message.channel.send({embed: {
                    author: {
                        name: `${player.name}'s ${character.name} needs:`
                    },
                    fields: fields,
                    footer: {
                        text: message.language.get("BASE_SWGOH_LAST_UPDATED", client.duration(player.updated, message))
                    }
                }});
            }
        }
    }
}

module.exports = Charactergear;
