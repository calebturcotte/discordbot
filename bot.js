//first line needed to read process envs
require('dotenv').config();

// Load up the discord.js library
const Discord = require("discord.js");

// This is your client. Some people call it `bot`, some people call it `self` 
// This is where most of the discord functionality comes from
const client = new Discord.Client();

// Here is an example to load a config.json file that contains our token and our prefix values. 
//const config = require("./config.json");

// config.token contains the bot's token
// config.prefix contains the message prefix.
//For Heroku Functionality we are going to use process.env
const config = process.env;

//below is the setup for our MongoDB connection config.mongosite are the url used to connect to your mongo database 
const MongoClient = require('mongodb').MongoClient;
const uri = config.mongosite;
const mongoclient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


//this is used for our screen scraping functionality
const rp = require('request-promise');
const $ = require('cheerio');

//Adding our Twitter functionality
var Twitter = require('twitter');

var tclient = new Twitter({
    consumer_key: config.consumertoken,
    consumer_secret: config.secrettoken,
    access_token_key: '',
    access_token_secret: ''
  });
   //"Here is some info on the events coming" was originally used but FEH's twitter format has changed
var params = {
  screen_name: 'FE_Heroes_EN',
  q: 'info on events (from:FE_Heroes_EN)',
  include_rts: false, 
  exclude_replies: true,
  count: '1',
  lang: 'en',
  tweet_mode: 'extended'
};

//link to gamepress website used
var heroweb = "https://gamepress.gg/feheroes/hero/";

client.on("ready", () => {
  var allGuilds = client.guilds;
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  //adds variable when bot logs in/turned on
  allGuilds.tap(function(guild){
    console.log("guild id:" + guild.id);
    
  });
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser"
  client.user.setActivity(config.prefix + 'help');
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);
  var allGuilds = client.guilds;
  //adds variable when the bot joins a guild

  allGuilds.tap(function(guild){
    
  });
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`Serving ${client.guilds.size} servers`);


});


client.on("message", async message => {
  
    // This event will run on every single message received, from any channel or DM.
  
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot){
    return;
    }
  // Also good practice to ignore any message that does not start with our prefix, 
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  
    if(command === "help"){
        message.channel.send("Hi I do things, try pressing !calendar");

    }

  //Commands below
  
  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    return;
  }
  
  if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
    // To get the "message" itself we join the `args` back into a string with spaces: 
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{}); 
    // And we get the bot to say the thing: 
    message.channel.send(sayMessage);
  }
  
  //Test for if the bot will react
  if(command === "poll"){
      const pollMessage = args.join(" ");
      if(pollMessage == ""){
        message.channel.send("Please enter something to poll about");
      }
      else{
        
        //Filters for reactions
      const filter = (reaction, user) => {
	    return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
      };
        message.channel.send("Who likes " + pollMessage + "?").then(SentEmbed => {
          SentEmbed.react('👍').then(() =>
          SentEmbed.react('👎'));
          var upvote = 0;
        var downvote = 0;
          SentEmbed.awaitReactions(filter, { max: message.guild.memberCount-1, time: 7000, errors: ['time'] }).then(collected => {
        const reaction = collected.first();
        
        if (reaction.emoji.name === '👍') {
          upvote++;
          
    
        } else if(reaction.emoji.name === '👎'){
         downvote++;
          
        }
      }).catch(collected => {
        console.log("Results are in " + upvote + " out of " + message.guild.memberCount + " reacted.");
      }).then(() => {
      message.channel.send('Results are in, '+ upvote + ' out of ' + message.guild.memberCount + ' reacted.');
      message.channel.send(downvote + ' don\'t agree with this message');
      SentEmbed.clearReactions();
      })
    })
  }}

  //twitter command
  if(command === "calendar"){
    tclient.get('search/tweets', params, function(error, tweets, response) {
        if(!error){
          if(tweets.statuses[0] != null){
            var img = tweets.statuses[0].extended_entities.media[0].media_url_https;
            //for now each successful tweet search will replace our value in the database
            insertcalendar(img);
       
            console.log(tweets);
            var embedmessage = new Discord.RichEmbed().setTitle("The current calendar").setImage(img);
            message.channel.send(embedmessage);
          }
          else {
            retrievecalendar(function(image){
              console.log(image);
              var embedmessage = new Discord.RichEmbed().setTitle("The current calendar").setImage(image);
              message.channel.send(embedmessage);
            })
          }
        }
     });

  }

  //gamepress command
  if(command === "h" || command === "hero"){
    value = message.content.slice(config.prefix.length).trim().split(/ +/g);
    if (value[1] == null) return;
      if(value[2] != null){
        var heroname = value[1]+'-'+value[2];
      }else{
        var heroname = value[1];
      }
      var url = heroweb + heroname;
      rp(url).then(function(html){
      //first we collect info about the hero
      var herostring = $('.modal-img-target',html).attr('onclick');
      var herolength = herostring.match(/\('[^]+'\)+/g)[0].length - 2;
      
      var heroalts = [];
      $('.feh-list-title',html).each( (index, value) =>{
        heroalts[index]= $(value).text();
      });

      var herolinks=[];
      $('div[class="feh-list-item"]', html).find('a').each( (index,value) => {
           herolinks[index] = $(value).attr('href')
         });
      
      var bst = $('.max-stats-number',html).text();
      var stats = $('.stat-text',html).text();

      //then we create our embedded message
      const embedmessage = new Discord.RichEmbed()
      embedmessage.setTitle(heroname).setURL(url).setImage("https://gamepress.gg/"+herostring.match(/\('[^]+'\)+/g)[0].substring(2, herolength))
      .addField('Base Stat Total: '+ bst, stats, true);
      //and add extra information if it is available
      var altinfo = '';
      heroalts.forEach((item,index) => {
        altinfo+= "[" + item+"]("+herolinks[index]+")" + '\n'
      });
      if(altinfo[0] != null) embedmessage.addField('Alts', altinfo);
      
      message.channel.send(embedmessage);
    }).catch(function(err){
      message.channel.send("This hero is not in FEH yet!");
      //handle error
    });
  }  
  
  //manga search command
  if(command == "m" ||command == "manga"){
    console.log("message received");
    rp("https://fire-emblem-heroes.com/en/manga/").then(function(html){
      var manganum = $('.new',html).parent().attr('href');
      var mangalink="https://fire-emblem-heroes.com/en/manga/part/files/img/" + manganum.substr(manganum.length-10)+ ".jpg";
      var embedmessage = new Discord.RichEmbed().setTitle("The current manga").setImage(mangalink);
      message.channel.send(embedmessage);
    }).catch(function(err){
      message.channel.send("This feature doesn't appear to be working!");
      //handle error
    });
  }


})

client.login(config.token);

//we will make a callback function to retrieve the calendar so we can use it in an embedded message
retrievecalendar = function(callback){
  mongoclient.connect(err => {
  
    const collection = mongoclient.db("armory").collection("calendars")
    
    // perform actions on the collection object
    collection.findOne({_id:1},function(err, items) {
      if (items !=null){
        return callback(items.calendar);
      }
      else console.log("query is null");
    })
  });
}

//and another function to insert the calendar
insertcalendar = function(webstring){
  mongoclient.connect(err => {
    if (err) throw console.log(err);
      const collection = mongoclient.db("armory").collection("calendars")

    // perform actions on the collection object
    collection.deleteMany({_id:1})
      collection.insertOne({_id:1,calendar: webstring}, (err, result) => {
          console.log("logged : " + webstring);
      })
    
  });
}

