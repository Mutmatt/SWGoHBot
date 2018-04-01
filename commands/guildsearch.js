const Command = require('../base/Command');
const mysql = require('mysql');

class GuildSearch extends Command {
    constructor(client) {
        super(client, {
            name: 'guildsearch',
            category: "SWGoH",
            aliases: ['search']
        });
    }

    async run(client, message, [userID, ...searchChar], level) { // eslint-disable-line no-unused-vars
        const charRarity = {
            "ONE_STAR":   1,
            "TWO_STAR":   2,
            "THREE_STAR": 3,
            "FOUR_STAR":  4,
            "FIVE_STAR":  5,
            "SIX_STAR":   6,
            "SEVEN_STAR": 7
        }

        let starLvl = null;
        // If there's enough elements in searchChar, and it's in the format of a numer*
        if (searchChar.length > 0 && searchChar[searchChar.length-1].match(/\d\*/)) {
            starLvl = parseInt(searchChar.pop().replace('*', ''));
            if (starLvl < 1 || starLvl > 7) {
                return message.channel.send(message.language.COMMAND_GUILDSEARCH_BAD_STAR);
            }
        }
        
        searchChar = searchChar.join(' ');

        // Need to get the allycode from the db, then use that
        if (!userID) {
            return message.channel.send(message.language.COMMAND_GUILDSEARCH_MISSING_CHAR)
        } else if (userID === "me") {
            userID = message.author.id;
        } else if (userID.match(/\d{17,18}/)) {
            userID = userID.replace(/[^\d]*/g, '');
        } else {
            // If they're just looking for a character for themselves, get the char
            searchChar = userID + ' ' + searchChar;
            searchChar = searchChar.trim();
            userID = message.author.id;
        }
        const chars = client.findChar(searchChar, client.characters);
        let character;
        if (!searchChar) {
            return message.channel.send(message.language.COMMAND_GUILDSEARCH_MISSING_CHAR);
        } else if (chars.length === 0) {
            return message.channel.send(message.language.COMMAND_GUILDSEARCH_NO_RESULTS(searchChar));
        } else if (chars.length > 1) {
            const charL = [];
            const charS = chars.sort((p, c) => p.name > c.name ? 1 : -1);
            charS.forEach(c => {
                charL.push(c.name);
            });
            return message.channel.send(message.laguage.COMMAND_GUILDSEARCH_CHAR_LIST(charL.join('\n')));
        } else {
            character = chars[0];
        }

        let ally = await client.allyCodes.findOne({where: {id: userID}});
        if (!ally) {
            return message.channel.send(message.language.BASE_SWGOH_NOT_REG(client.users.get(userID).tag));
        }       
        const allyCode = ally.dataValues.allyCode

        const pool = mysql.createPool({
            host     : client.config.mySqlDB.host,
            user     : client.config.mySqlDB.user,
            password : client.config.mySqlDB.password,
            database : client.config.mySqlDB.database,
            connectionLimit : 100
        });
        let name, guildName;
        const allyCodes = [];
        const charList = {};
        await pool.query(`CALL getGuildMembersFromAlly(${allyCode})`, async function(err, results) {
            results[0].forEach(row => {
                allyCodes.push(row.allyCode)
                guildName = row.guildName;
            });
            for (var i = 0; i < allyCodes.length; i++) {
                const res = await getResult(`call getCharFromAlly(${allyCodes[i]}, '${character.uniqueName}');`);
                if (res[0][0]) {
                    const thisRes = res[0][0];
                    name = thisRes.guildName;
                    const rarity = charRarity[thisRes.rarity];
                    if (!charList[rarity]) {
                        charList[rarity] = [thisRes.name];
                    } else {
                        charList[rarity].push(thisRes.name);
                    }
                }
            }
            pool.end();
            const fields = [];
            Object.keys(charList).forEach((tier, ix) => {
                // Sort the names of everyone 
                const sorted = charList[tier].sort((p, c) => p > c ? 1 : -1);
                if (starLvl && starLvl !== parseInt(tier)) return; 
                fields.push({
                    name: message.language.COMMAND_GUILDSEARCH_FIELD_HEADER(tier, charList[tier].length),
                    value: sorted.join('\n')
                })
            });
            if (fields.length === 0) {
                if (starLvl) {
                    fields.push({
                        name: starLvl + ' Star (0)',
                        value:  message.language.COMMAND_GUILDSEARCH_NO_CHAR_STAR(starLvl)
                    });
                } else {
                    fields.push({
                        name: '(0)',
                        value:  message.language.COMMAND_GUILDSEARCH_NO_CHAR
                    });
                }
            }
            const auth = message.guild.members.get(userID);
            message.channel.send({embed: {
                color: 0x000000,
                author: {
                    name: `${guildName}'s ${character.name}`
                },
                fields: fields
            }})
        });




        function getResult(sql){
            return new Promise(function(resolve,reject){
                pool.query(sql, function(err, result){
                    if(err){
                        reject(err)
                    }else{
                        resolve(result)
                    }
                })
            })
        }
    }
}

module.exports = GuildSearch;
