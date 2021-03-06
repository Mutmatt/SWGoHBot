const Command = require("../base/Command");

class Abilities extends Command {
    constructor(client) {
        super(client, {
            name: "abilities",
            description: "",
            category: "Star Wars",
            aliases: ["a", "ab"]
        });
    }

    async run(client, message, args) {
        const charList = client.characters;

        const searchName = String(args.join(" ")).toLowerCase().replace(/[^\w\s]/gi, "");


        const zeta = client.emojis.find("name", "zeta");
        const omega = client.emojis.find("name", "omega");
        const abilityMatMK3 = client.emojis.find("name", "abilityMatMK3");

        // Make sure they gave a character to find
        if (searchName === "") {
            return message.channel.send(message.language.get("COMMAND_ABILITIES_NEED_CHARACTER", message.guildSettings.prefix));
        }

        // Find any characters that match that
        const chars = client.findChar(searchName, charList);
        if (chars.length <= 0) {
            return message.channel.send(message.language.get("COMMAND_ABILITIES_INVALID_CHARACTER", message.guildSettings.prefix));        
        } else if (chars.length > 1) {
            const charL = [];
            const charS = chars.sort((p, c) => p.name > c.name ? 1 : -1);
            charS.forEach(c => {
                charL.push(c.name);
            });
            return message.channel.send(message.language.get("BASE_SWGOH_CHAR_LIST", charL.join("\n")));
        }

        const character = chars[0];

        const char = await client.swgohAPI.getCharacter(character.uniqueName, message.guildSettings.swgohLanguage);

        const fields = [];
        for (const ability of char.skillReferenceList) {
            // Get the ability type
            const types = ["basic", "special", "leader", "unique", "contract"];
            let type = "Basic";
            types.forEach(t => {
                if (ability.skillId.startsWith(t)) {
                    type = t.toProperCase();
                }
            });

            const costs = [];
            if (ability.cost) {
                if (ability.cost.AbilityMatZeta > 0) {
                    costs.push(`${ability.cost.AbilityMatZeta} ${zeta}`);
                } 
                if (ability.cost.AbilityMatOmega > 0) {
                    costs.push(`${ability.cost.AbilityMatOmega} ${omega}`);
                } 
                if (ability.cost.AbilityMatMk3 > 0) {
                    costs.push(`${ability.cost.AbilityMatMk3} ${abilityMatMK3}`);
                }
            } else {
                console.log(ability);
            }
            const costStr = costs.length > 0 ? costs.join(" | ") : "";

            var cooldownString = "";
            if (ability.cooldown > 0) {
                cooldownString = message.language.get("COMMAND_ABILITIES_COOLDOWN", ability.cooldown);
            }

            const msgArr = client.msgArray(client.expandSpaces(message.language.get("COMMAND_ABILITIES_ABILITY", type, costStr, cooldownString, ability.desc)).split(" "), " ", 1000);

            msgArr.forEach((m, ix) => {
                if (ix === 0) {
                    fields.push({
                        "name": ability.name,
                        "value": m
                    });
                } else {
                    fields.push({
                        "name": "-",
                        "value": m
                    });
                }
            });
        }

        message.channel.send({
            embed: {
                "color": `${character.side === "light" ? 0x5114e0 : 0xe01414}`,
                "author": {
                    "name": character.name,
                    "url": character.url,
                    "icon_url": character.avatarURL
                },
                "fields": fields
            }
        });
    }
}

module.exports = Abilities;
