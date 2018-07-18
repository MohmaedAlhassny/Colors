const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const fs = require('fs');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');

const yt_api_key = "AIzaSyDeoIH0u1e72AtfpwSKKOSy3IPp2UHzqi4";
const prefix = '1';

client.on('ready', function() {
	console.log(`i am ready ${client.user.username}`);
	console.log('work');
	client.user.setGame('1Play | SmileServer', 'https://twitch.tv/JSmileServer');
	
});



var servers = [];
var queue = [];
var guilds = [];
var queueNames = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];
var now_playing = [];

client.on('message', function(message) {
	const member = message.member;
	const mess = message.content.toLowerCase();
	const args = message.content.split(' ').slice(1).join(' ');

	if (mess.startsWith(prefix + 'play')) {
		if (!message.member.voiceChannel) return message.reply('** لازم تدخل روم صوتي عشان تقدر تشغل :notes: **');
		// if user is not insert the URL or song title
		if (args.length == 0) {
			let play_info = new Discord.RichEmbed()
				.setAuthor(client.user.username, client.user.avatarURL)
				.setDescription('**قم بوضع  اسم او رابط الاغنية :notes:*')
				.setFooter("تم طلبها بواسطة:", message.author.tag)
			message.channel.sendEmbed(play_info)
			return;
		}
		if (queue.length > 0 || isPlaying) {
			getID(args, function(id) {
				add_to_queue(id);
				fetchVideoInfo(id, function(err, videoInfo) {
					if (err) throw new Error(err);
					let play_info = new Discord.RichEmbed()
						.setAuthor(message.author.avatarURL, message.author.tag)
						.setDescription(`**يتم تشغيل :**`)
						.addField(`**${videoInfo.title}**`, true)
						.setColor("RANDOM")
						.setFooter('SmileServer Music')
						.setImage(videoInfo.thumbnailUrl)
					//.setDescription('?')
					client.user.setGame(`**${videoInfo.title}**`);
					message.channel.sendEmbed(play_info);
					queueNames.push(videoInfo.title);
					// let now_playing = videoInfo.title;
					now_playing.push(videoInfo.title);

				});
			});
		}
		else {

			isPlaying = true;
			getID(args, function(id) {
				queue.push('placeholder');
				playMusic(id, message);
				fetchVideoInfo(id, function(err, videoInfo) {
					if (err) throw new Error(err);
					let play_info = new Discord.RichEmbed()
						.setAuthor(message.author.tag, message.author.avatarURL)
						.setDescription(`**تمت أضافتها لقائمة الاغاني القادمة**`)
						.addField(`**${videoInfo.title}**`, true)
						.setColor("RANDOM")
						.setFooter('تم طلبها بواسطة:' + message.author.tag)
						.setThumbnail(videoInfo.thumbnailUrl)
					//.setDescription('?')
					message.channel.sendEmbed(play_info);
				});
			});
		}
	}
	else if (mess.startsWith(prefix + 'skip')) {
		if (!message.member.voiceChannel) return message.reply('**عفوا ,انت غير موجود في روم صوتي**');
		message.reply(':notes: **تم التخطي**').then(() => {
			skip_song(message);
			var server = server = servers[message.guild.id];
			if (message.guild.voiceConnection) message.guild.voiceConnection.end();
			client.user.setGame(`${prefix}play | SmileServer`, 'https://twitch.tv/SmileServer');
		});
	}
	else if (message.content.startsWith(prefix + 'vol')) {
		if (!message.member.voiceChannel) return message.reply('**عفوا ,انت غير موجود في روم صوتي**');
		// console.log(args)
		if (args > 100) return message.reply(':x: **100**');
		if (args < 1) return message.reply(":x: **1**");
		dispatcher.setVolume(1 * args / 50);
		message.channel.sendMessage(`Volume Updated To: **${dispatcher.volume*50}**`);
	}
	else if (mess.startsWith(prefix + 'pause')) {
		if (!message.member.voiceChannel) return message.reply('**عفوا ,انت غير موجود في روم صوتي**');
		message.reply(':gear: **تم الايقاف مؤقت**').then(() => {
			dispatcher.pause();
			client.user.setGame(`${prefix}play | SmileServer`, 'https://twitch.tv/SmileServer');			
		});
	}
	else if (mess.startsWith(prefix + 'resume')) {
		if (!message.member.voiceChannel) return message.reply('**عفوا ,انت غير موجود في روم صوتي**');
		message.reply(':gear: **تم اعاده التشغيل**').then(() => {
			dispatcher.resume();
			client.user.setGame(`${videoInfo.title}`);			
		});
	}
	else if (mess.startsWith(prefix + 'stop')) {
		if (!message.member.voiceChannel) return message.reply('**عفوا ,انت غير موجود في روم صوتي**');
		message.reply(':name_badge: **تم الايقاف**');
		var server = server = servers[message.guild.id];
		if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
			client.user.setGame(`${prefix}play | SmileServer`, 'https://twitch.tv/SmileServer');		
	}
	else if (mess.startsWith(prefix + 'join')) {
		if (!message.member.voiceChannel) return message.reply('**عفوا ,انت غير موجود في روم صوتي**');
		message.member.voiceChannel.join().then(message.react('✅'));
	}
	else if (mess.startsWith(prefix + 'play')) {
		getID(args, function(id) {
			add_to_queue(id);
			fetchVideoInfo(id, function(err, videoInfo) {
				if (err) throw new Error(err);
				if (!message.member.voiceChannel) return message.reply('**عفوا, انت غير موجود في روم صوتي**');
				if (isPlaying == false) return message.reply(':x:');
				let playing_now_info = new Discord.RichEmbed()
					.setAuthor(client.user.username, client.user.avatarURL)
					.setDescription(`**${videoInfo.title}**`)
					.setColor("RANDOM")
					.setFooter('Requested By:' + message.author.tag)
					.setImage(videoInfo.thumbnailUrl)
				message.channel.sendEmbed(playing_now_info);
				queueNames.push(videoInfo.title);
				client.user.setGame(`${videoInfo.title}`);
				// let now_playing = videoInfo.title;
				now_playing.push(videoInfo.title);

			});

		});
	}

	function skip_song(message) {
		if (!message.member.voiceChannel) return message.reply('**عفوا, انت غير موجود في روم صوتي**');
		dispatcher.end();
	}

	function playMusic(id, message) {
		voiceChannel = message.member.voiceChannel;


		voiceChannel.join().then(function(connectoin) {
			let stream = ytdl('https://www.youtube.com/watch?v=' + id, {
				filter: 'audioonly'
			});
			skipReq = 0;
			skippers = [];

			dispatcher = connectoin.playStream(stream);
			dispatcher.on('end', function() {
				skipReq = 0;
				skippers = [];
				queue.shift();
				queueNames.shift();
				if (queue.length === 0) {
					queue = [];
					queueNames = [];
					isPlaying = false;
				}
				else {
					setTimeout(function() {
						playMusic(queue[0], message);
					}, 500);
				}
			});
		});
	}

	function getID(str, cb) {
		if (isYoutube(str)) {
			cb(getYoutubeID(str));
		}
		else {
			search_video(str, function(id) {
				cb(id);
			});
		}
	}

	function add_to_queue(strID) {
		if (isYoutube(strID)) {
			queue.push(getYoutubeID(strID));
		}
		else {
			queue.push(strID);
		}
	}

	function search_video(query, cb) {
		request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
			var json = JSON.parse(body);
			cb(json.items[0].id.videoId);
		});
	}


	function isYoutube(str) {
		return str.toLowerCase().indexOf('youtube.com') > -1;
	}
});

var amount = 'مستوى الصوت';

var helpe = `**Help Commands..

${prefix}play > لتشغيل أغنية معينة
${prefix}vol ${amount} > لتغيير الصوت
${prefix}skip > لتخطي الاغنية
${prefix}stop > لأيقاف الاغنية
${prefix}pause > لأيقاف الاغنية مؤقتاً
${prefix}resume > لتشغيل الاغنية التي وقفتها مؤقتاً**`;

var HelpEmbed = new Discord.RichEmbed()

	.setAuthor(message.author.avatarURL, message.author.username)
	.setDescription(helpe)
	.setColor('RANDOM')
	.setFooter("Help Commands.")


client.on('message', message => {
var HelpEmbed = new Discord.RichEmbed()

	.setAuthor(message.author.avatarURL, message.author.username)
	.setDescription(helpe)
	.setColor('RANDOM')
	.setFooter("Help Commands.")	
	if(message.content == `${prefix}help`) {
		message.channel.send('تم أرسال قائمة المساعدة.')
		message.author.send(HelpEmbed);
	}
});
